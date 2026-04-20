import type {
  ProjectDetail,
  ProjectFormState,
  ProjectUpsertInput,
  QuotationItemFormValue,
} from "@/types/app";
import { centsToMoneyText, parseIntegerInput, parseMoneyToCents, sumCents } from "@/utils/money";
import { FOLLOW_STAGE_OPTIONS } from "@/types/stages";

export function createEmptyQuotationItem(): QuotationItemFormValue {
  return {
    productName: "",
    brand: "",
    model: "",
    quantity: "1",
    unit: "台",
    unitPrice: "",
  };
}

export function createEmptyProjectForm(): ProjectFormState {
  return {
    projectNo: "",
    customerName: "",
    phone: "",
    address: "",
    roomCount: "0",
    planType: "",
    followStage: FOLLOW_STAGE_OPTIONS[1] ?? "跟进中",
    remark: "",
    quotationItems: [createEmptyQuotationItem()],
  };
}

export function buildProjectFormFromDetail(detail: ProjectDetail): ProjectFormState {
  return {
    projectNo: detail.projectNo,
    customerName: detail.customerName,
    phone: detail.phone,
    address: detail.address,
    roomCount: String(detail.roomCount ?? 0),
    planType: detail.planType,
    followStage: detail.followStage,
    remark: detail.remark,
    quotationItems:
      detail.quotationItems.length > 0
        ? detail.quotationItems.map((item) => ({
            productName: item.productName,
            brand: item.brand,
            model: item.model,
            quantity: String(item.quantity),
            unit: item.unit,
            unitPrice: centsToMoneyText(item.unitPriceCents),
          }))
        : [createEmptyQuotationItem()],
  };
}

function isBlankRow(item: QuotationItemFormValue): boolean {
  return [
    item.productName,
    item.brand,
    item.model,
    item.quantity,
    item.unit,
    item.unitPrice,
  ].every((value) => !String(value).trim());
}

export function calculateQuotationItemSubtotalCents(item: QuotationItemFormValue): number {
  const quantity = parseIntegerInput(item.quantity);
  const unitPriceCents = parseMoneyToCents(item.unitPrice);
  if (quantity <= 0 || unitPriceCents <= 0) {
    return 0;
  }

  return quantity * unitPriceCents;
}

export function calculateProjectTotalCents(items: QuotationItemFormValue[]): number {
  return sumCents(items.filter((item) => !isBlankRow(item)).map(calculateQuotationItemSubtotalCents));
}

export function normalizeProjectForm(form: ProjectFormState): ProjectUpsertInput {
  const projectNo = form.projectNo.trim();
  const customerName = form.customerName.trim();
  const phone = form.phone.trim();
  const address = form.address.trim();
  const planType = form.planType.trim();
  const followStage = form.followStage.trim();
  const remark = form.remark.trim();
  const roomCount = parseIntegerInput(form.roomCount);

  if (!projectNo) {
    throw new Error("请输入项目编号。");
  }

  if (!customerName) {
    throw new Error("请输入客户姓名。");
  }

  if (!phone) {
    throw new Error("请输入联系电话。");
  }

  if (!address) {
    throw new Error("请输入项目地址。");
  }

  if (roomCount <= 0) {
    throw new Error("请输入正确的房间数量。");
  }

  if (!planType) {
    throw new Error("请输入方案类型。");
  }

  if (!followStage) {
    throw new Error("请选择跟进阶段。");
  }

  const quotationItems = form.quotationItems
    .filter((item) => !isBlankRow(item))
    .map((item, index) => {
      const productName = item.productName.trim();
      const brand = item.brand.trim();
      const model = item.model.trim();
      const unit = item.unit.trim();
      const quantity = parseIntegerInput(item.quantity);
      const unitPriceCents = parseMoneyToCents(item.unitPrice);

      if (!productName) {
        throw new Error(`第 ${index + 1} 条报价明细缺少产品名称。`);
      }

      if (quantity <= 0) {
        throw new Error(`第 ${index + 1} 条报价明细数量必须大于 0。`);
      }

      if (!unit) {
        throw new Error(`第 ${index + 1} 条报价明细缺少单位。`);
      }

      if (unitPriceCents <= 0) {
        throw new Error(`第 ${index + 1} 条报价明细单价必须大于 0。`);
      }

      return {
        productName,
        brand,
        model,
        quantity,
        unit,
        unitPriceCents,
      };
    });

  return {
    projectNo,
    customerName,
    phone,
    address,
    roomCount,
    planType,
    followStage,
    remark,
    quotationItems,
  };
}
