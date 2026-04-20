import type { QuotationItemFormValue } from "@/types/app";
import { calculateQuotationItemSubtotalCents } from "@/utils/projectForm";
import { centsToCurrency } from "@/utils/money";

interface QuotationItemsEditorProps {
  items: QuotationItemFormValue[];
  onChange: (items: QuotationItemFormValue[]) => void;
}

function updateItem(
  items: QuotationItemFormValue[],
  index: number,
  field: keyof QuotationItemFormValue,
  value: string,
) {
  return items.map((item, currentIndex) =>
    currentIndex === index
      ? {
          ...item,
          [field]: value,
        }
      : item,
  );
}

export function QuotationItemsEditor({ items, onChange }: QuotationItemsEditorProps) {
  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">报价明细</h2>
          <p className="card-subtitle">支持新增、删除和自动计算小计。合同金额会根据明细自动汇总。</p>
        </div>
        <button
          type="button"
          className="button button-secondary"
          onClick={() =>
            onChange([
              ...items,
              {
                productName: "",
                brand: "",
                model: "",
                quantity: "1",
                unit: "台",
                unitPrice: "",
              },
            ])
          }
        >
          新增明细行
        </button>
      </div>

      <div className="table-wrap">
        <table className="table table-compact">
          <thead>
            <tr>
              <th>产品名称</th>
              <th>品牌</th>
              <th>型号</th>
              <th>数量</th>
              <th>单位</th>
              <th>单价</th>
              <th>小计</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? (
              items.map((item, index) => {
                const subtotalCents = calculateQuotationItemSubtotalCents(item);

                return (
                  <tr key={`${index}-${item.productName}-${item.brand}`}>
                    <td>
                      <input
                        className="cell-input"
                        value={item.productName}
                        onChange={(event) => onChange(updateItem(items, index, "productName", event.target.value))}
                        placeholder="例如：中控屏"
                      />
                    </td>
                    <td>
                      <input
                        className="cell-input"
                        value={item.brand}
                        onChange={(event) => onChange(updateItem(items, index, "brand", event.target.value))}
                        placeholder="品牌"
                      />
                    </td>
                    <td>
                      <input
                        className="cell-input"
                        value={item.model}
                        onChange={(event) => onChange(updateItem(items, index, "model", event.target.value))}
                        placeholder="型号"
                      />
                    </td>
                    <td>
                      <input
                        className="cell-input"
                        type="number"
                        min="0"
                        step="1"
                        value={item.quantity}
                        onChange={(event) => onChange(updateItem(items, index, "quantity", event.target.value))}
                      />
                    </td>
                    <td>
                      <input
                        className="cell-input"
                        value={item.unit}
                        onChange={(event) => onChange(updateItem(items, index, "unit", event.target.value))}
                        placeholder="台"
                      />
                    </td>
                    <td>
                      <input
                        className="cell-input"
                        type="text"
                        inputMode="decimal"
                        value={item.unitPrice}
                        onChange={(event) => onChange(updateItem(items, index, "unitPrice", event.target.value))}
                        placeholder="0.00"
                      />
                    </td>
                    <td className="table-money">{centsToCurrency(subtotalCents)}</td>
                    <td>
                      <button
                        type="button"
                        className="button button-ghost button-danger"
                        onClick={() => onChange(items.filter((_, currentIndex) => currentIndex !== index))}
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8}>
                  <div className="table-empty">暂无明细，点击“新增明细行”开始录入。</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
