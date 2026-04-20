use crate::models::{
  DashboardStats, ProjectDetail, ProjectFilters, ProjectUpsertInput, ProjectSummary, QuotationItemInput,
  QuotationItemRecord,
};
use anyhow::{anyhow, Context, Result};
use chrono::Utc;
use rusqlite::{params, params_from_iter, Connection};
use std::collections::HashSet;
use uuid::Uuid;

const FOLLOW_UP_STAGES: &[&str] = &["跟进中", "方案中", "报价中"];
const SIGNED_STAGES: &[&str] = &["已签约"];

fn now_iso() -> String {
  Utc::now().to_rfc3339()
}

fn validate_input(input: &ProjectUpsertInput) -> Result<()> {
  if input.project_no.trim().is_empty() {
    return Err(anyhow!("请输入项目编号。"));
  }
  if input.customer_name.trim().is_empty() {
    return Err(anyhow!("请输入客户姓名。"));
  }
  if input.phone.trim().is_empty() {
    return Err(anyhow!("请输入联系电话。"));
  }
  if input.address.trim().is_empty() {
    return Err(anyhow!("请输入项目地址。"));
  }
  if input.room_count <= 0 {
    return Err(anyhow!("请输入正确的房间数量。"));
  }
  if input.plan_type.trim().is_empty() {
    return Err(anyhow!("请输入方案类型。"));
  }
  if input.follow_stage.trim().is_empty() {
    return Err(anyhow!("请选择跟进阶段。"));
  }

  for (index, item) in input.quotation_items.iter().enumerate() {
    if item.product_name.trim().is_empty() {
      return Err(anyhow!("第 {} 条报价明细缺少产品名称。", index + 1));
    }
    if item.quantity <= 0 {
      return Err(anyhow!("第 {} 条报价明细数量必须大于 0。", index + 1));
    }
    if item.unit.trim().is_empty() {
      return Err(anyhow!("第 {} 条报价明细缺少单位。", index + 1));
    }
    if item.unit_price_cents <= 0 {
      return Err(anyhow!("第 {} 条报价明细单价必须大于 0。", index + 1));
    }
  }

  Ok(())
}

fn calculate_total_cents(items: &[QuotationItemInput]) -> i64 {
  items
    .iter()
    .map(|item| item.quantity.saturating_mul(item.unit_price_cents))
    .sum()
}

fn row_to_summary(row: &rusqlite::Row<'_>) -> rusqlite::Result<ProjectSummary> {
  Ok(ProjectSummary {
    id: row.get("id")?,
    project_no: row.get("project_no")?,
    customer_name: row.get("customer_name")?,
    phone: row.get("phone")?,
    address: row.get("address")?,
    room_count: row.get("room_count")?,
    plan_type: row.get("plan_type")?,
    follow_stage: row.get("follow_stage")?,
    contract_amount_cents: row.get("contract_amount_cents")?,
    quotation_item_count: row.get("quotation_item_count")?,
    created_at: row.get("created_at")?,
    updated_at: row.get("updated_at")?,
  })
}

fn row_to_item(row: &rusqlite::Row<'_>) -> rusqlite::Result<QuotationItemRecord> {
  Ok(QuotationItemRecord {
    id: row.get("id")?,
    project_id: row.get("project_id")?,
    product_name: row.get("product_name")?,
    brand: row.get("brand")?,
    model: row.get("model")?,
    quantity: row.get("quantity")?,
    unit: row.get("unit")?,
    unit_price_cents: row.get("unit_price_cents")?,
    subtotal_cents: row.get("subtotal_cents")?,
    created_at: row.get("created_at")?,
    updated_at: row.get("updated_at")?,
  })
}

pub fn list_projects(connection: &Connection, filters: &ProjectFilters) -> Result<Vec<ProjectSummary>> {
  let mut query = String::from(
    r#"
    SELECT
      p.id,
      p.project_no,
      p.customer_name,
      p.phone,
      p.address,
      p.room_count,
      p.plan_type,
      p.follow_stage,
      p.contract_amount_cents,
      COUNT(q.id) AS quotation_item_count,
      p.created_at,
      p.updated_at
    FROM projects p
    LEFT JOIN quotation_items q ON q.project_id = p.id
    WHERE 1 = 1
    "#,
  );

  let mut values: Vec<String> = Vec::new();

  if let Some(project_no) = filters.project_no.as_ref().map(|value| value.trim()).filter(|value| !value.is_empty()) {
    query.push_str(" AND p.project_no LIKE ?");
    values.push(format!("%{project_no}%"));
  }

  if let Some(customer_name) = filters.customer_name.as_ref().map(|value| value.trim()).filter(|value| !value.is_empty()) {
    query.push_str(" AND p.customer_name LIKE ?");
    values.push(format!("%{customer_name}%"));
  }

  if let Some(phone) = filters.phone.as_ref().map(|value| value.trim()).filter(|value| !value.is_empty()) {
    query.push_str(" AND p.phone LIKE ?");
    values.push(format!("%{phone}%"));
  }

  query.push_str(" GROUP BY p.id ORDER BY p.updated_at DESC");

  let mut statement = connection.prepare(&query).context("prepare project list query")?;
  let rows = statement
    .query_map(params_from_iter(values.iter()), row_to_summary)
    .context("query projects")?;

  let mut projects = Vec::new();
  for row in rows {
    projects.push(row.context("map project row")?);
  }

  Ok(projects)
}

pub fn get_project(connection: &Connection, id: &str) -> Result<Option<ProjectDetail>> {
  let mut statement = connection
    .prepare(
      r#"
      SELECT
        id,
        project_no,
        customer_name,
        phone,
        address,
        room_count,
        plan_type,
        follow_stage,
        contract_amount_cents,
        remark,
        created_at,
        updated_at
      FROM projects
      WHERE id = ?
      "#,
    )
    .context("prepare project detail query")?;

  let project = match statement.query_row(params![id], |row| {
    Ok(ProjectDetail {
      id: row.get("id")?,
      project_no: row.get("project_no")?,
      customer_name: row.get("customer_name")?,
      phone: row.get("phone")?,
      address: row.get("address")?,
      room_count: row.get("room_count")?,
      plan_type: row.get("plan_type")?,
      follow_stage: row.get("follow_stage")?,
      contract_amount_cents: row.get("contract_amount_cents")?,
      remark: row.get("remark")?,
      quotation_items: Vec::new(),
      created_at: row.get("created_at")?,
      updated_at: row.get("updated_at")?,
    })
  }) {
    Ok(project) => project,
    Err(rusqlite::Error::QueryReturnedNoRows) => return Ok(None),
    Err(error) => return Err(anyhow::Error::new(error).context("load project detail")),
  };

  let mut item_statement = connection
    .prepare(
      r#"
      SELECT
        id,
        project_id,
        product_name,
        brand,
        model,
        quantity,
        unit,
        unit_price_cents,
        subtotal_cents,
        created_at,
        updated_at
      FROM quotation_items
      WHERE project_id = ?
      ORDER BY created_at ASC
      "#,
    )
    .context("prepare quotation item query")?;

  let items = item_statement
    .query_map(params![id], row_to_item)
    .context("query quotation items")?
    .collect::<Result<Vec<_>, _>>()
    .context("map quotation items")?;

  Ok(Some(ProjectDetail {
    quotation_items: items,
    ..project
  }))
}

pub fn list_all_project_details(connection: &Connection) -> Result<Vec<ProjectDetail>> {
  let projects = list_projects(
    connection,
    &ProjectFilters {
      project_no: None,
      customer_name: None,
      phone: None,
    },
  )?;

  let mut details = Vec::with_capacity(projects.len());
  for project in projects {
    if let Some(detail) = get_project(connection, &project.id)? {
      details.push(detail);
    }
  }

  Ok(details)
}

pub fn create_project(connection: &mut Connection, input: &ProjectUpsertInput) -> Result<ProjectDetail> {
  validate_input(input)?;
  let now = now_iso();
  let total_cents = calculate_total_cents(&input.quotation_items);
  let project_id = Uuid::new_v4().to_string();
  let transaction = connection.transaction().context("start create transaction")?;

  transaction
    .execute(
      r#"
      INSERT INTO projects (
        id, project_no, customer_name, phone, address, room_count, plan_type, follow_stage,
        contract_amount_cents, remark, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      "#,
      params![
        project_id,
        input.project_no.trim(),
        input.customer_name.trim(),
        input.phone.trim(),
        input.address.trim(),
        input.room_count,
        input.plan_type.trim(),
        input.follow_stage.trim(),
        total_cents,
        input.remark.trim(),
        now,
        now,
      ],
    )
    .context("insert project")?;

  for item in &input.quotation_items {
    let item_id = Uuid::new_v4().to_string();
    let subtotal_cents = item.quantity.saturating_mul(item.unit_price_cents);
    transaction
      .execute(
        r#"
        INSERT INTO quotation_items (
          id, project_id, product_name, brand, model, quantity, unit,
          unit_price_cents, subtotal_cents, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#,
        params![
          item_id,
          project_id,
          item.product_name.trim(),
          item.brand.trim(),
          item.model.trim(),
          item.quantity,
          item.unit.trim(),
          item.unit_price_cents,
          subtotal_cents,
          now,
          now,
        ],
      )
      .context("insert quotation item")?;
  }

  transaction.commit().context("commit create transaction")?;
  get_project(connection, &project_id)?.ok_or_else(|| anyhow!("create project failed"))
}

pub fn update_project(connection: &mut Connection, id: &str, input: &ProjectUpsertInput) -> Result<ProjectDetail> {
  validate_input(input)?;
  let now = now_iso();
  let total_cents = calculate_total_cents(&input.quotation_items);
  let transaction = connection.transaction().context("start update transaction")?;

  transaction
    .query_row("SELECT id FROM projects WHERE id = ?", params![id], |row| row.get::<_, String>(0))
    .map_err(|error| match error {
      rusqlite::Error::QueryReturnedNoRows => anyhow!("项目不存在，无法更新。"),
      other => anyhow::Error::new(other),
    })?;

  transaction
    .execute(
      r#"
      UPDATE projects
      SET project_no = ?, customer_name = ?, phone = ?, address = ?, room_count = ?, plan_type = ?,
          follow_stage = ?, contract_amount_cents = ?, remark = ?, updated_at = ?
      WHERE id = ?
      "#,
      params![
        input.project_no.trim(),
        input.customer_name.trim(),
        input.phone.trim(),
        input.address.trim(),
        input.room_count,
        input.plan_type.trim(),
        input.follow_stage.trim(),
        total_cents,
        input.remark.trim(),
        now,
        id,
      ],
    )
    .context("update project")?;

  transaction
    .execute("DELETE FROM quotation_items WHERE project_id = ?", params![id])
    .context("delete old quotation items")?;

  for item in &input.quotation_items {
    let item_id = Uuid::new_v4().to_string();
    let subtotal_cents = item.quantity.saturating_mul(item.unit_price_cents);
    transaction
      .execute(
        r#"
        INSERT INTO quotation_items (
          id, project_id, product_name, brand, model, quantity, unit,
          unit_price_cents, subtotal_cents, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#,
        params![
          item_id,
          id,
          item.product_name.trim(),
          item.brand.trim(),
          item.model.trim(),
          item.quantity,
          item.unit.trim(),
          item.unit_price_cents,
          subtotal_cents,
          now,
          now,
        ],
      )
      .context("insert quotation item")?;
  }

  transaction.commit().context("commit update transaction")?;
  get_project(connection, id)?.ok_or_else(|| anyhow!("项目不存在，无法更新。"))
}

pub fn delete_project(connection: &mut Connection, id: &str) -> Result<()> {
  let transaction = connection.transaction().context("start delete transaction")?;
  let affected = transaction
    .execute("DELETE FROM projects WHERE id = ?", params![id])
    .context("delete project")?;
  transaction.commit().context("commit delete transaction")?;

  if affected == 0 {
    return Err(anyhow!("项目不存在，无法删除。"));
  }

  Ok(())
}

pub fn dashboard_stats(connection: &Connection) -> Result<DashboardStats> {
  let mut statement = connection
    .prepare(
      r#"
      SELECT follow_stage, contract_amount_cents
      FROM projects
      ORDER BY updated_at DESC
      "#,
    )
    .context("prepare dashboard stats query")?;

  let rows = statement
    .query_map([], |row| {
      Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
    })
    .context("query dashboard stats")?;

  let mut total_projects = 0_i64;
  let mut follow_up_projects = 0_i64;
  let mut signed_projects = 0_i64;
  let mut total_contract_amount_cents = 0_i64;
  let follow_up_set: HashSet<&str> = FOLLOW_UP_STAGES.iter().copied().collect();
  let signed_set: HashSet<&str> = SIGNED_STAGES.iter().copied().collect();

  for row in rows {
    let (follow_stage, contract_amount_cents) = row.context("map dashboard row")?;
    total_projects += 1;
    total_contract_amount_cents += contract_amount_cents;

    if follow_up_set.contains(follow_stage.as_str()) {
      follow_up_projects += 1;
    }

    if signed_set.contains(follow_stage.as_str()) {
      signed_projects += 1;
    }
  }

  Ok(DashboardStats {
    total_projects,
    follow_up_projects,
    signed_projects,
    total_contract_amount_cents,
  })
}
