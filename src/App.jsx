import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

export default function App() {
  const [data, setData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [analysis, setAnalysis] = useState("");

  // 读取CSV
  const handleFile = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target.result;

      // 清理空行
      const rows = text.split("\n").filter(r => r.trim() !== "");

      // 表头
      const cols = rows[0].split(",").map(h => h.trim());
      setHeaders(cols);

      const xKey = cols[0]; // 第一列 = 时间轴

      // 转数据
      const parsed = rows.slice(1).map(row => {
        const values = row.split(",");
        let obj = {};

        cols.forEach((col, i) => {
          const v = values[i];
          obj[col] = i === 0 ? v : parseFloat(v);
        });

        return obj;
      }).filter(d => d[xKey] !== undefined);

      setData(parsed);

      runAnalysis(parsed, cols);
    };

    reader.readAsText(file);
  };

  // 简单异常分析（每一列独立判断）
  const runAnalysis = (data, cols) => {
    const xKey = cols[0];
    let result = "";

    cols.slice(1).forEach(key => {
      const values = data.map(d => d[key]).filter(v => !isNaN(v));

      if (values.length === 0) return;

      const last = values[values.length - 1];
      const prev = values[values.length - 2] ?? last;

      const max = Math.max(...values);
      const min = Math.min(...values);

      if (last > max * 0.95) {
        result += `⚠️ ${key}: 接近历史最大值\n`;
      }

      if (last < min * 1.05) {
        result += `⚠️ ${key}: 接近历史最小值\n`;
      }

      if (Math.abs(last - prev) > (max - min) * 0.3) {
        result += `⚠️ ${key}: 波动异常\n`;
      }
    });

    if (!result) result = "✅ 所有指标运行正常";

    setAnalysis(result);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>工业时序数据智能分析系统</h2>

      {/* 上传 */}
      <input type="file" accept=".csv" onChange={handleFile} />

      {/* 图表 */}
      <div style={{ marginTop: 20 }}>
        {data.length > 0 && headers.length > 0 && (
          <LineChart width={900} height={400} data={data}>
            <CartesianGrid strokeDasharray="3 3" />

            {/* 自动识别X轴 */}
            <XAxis dataKey={headers[0]} />
            <YAxis />
            <Tooltip />
            <Legend />

            {/* 自动生成所有曲线 */}
            {headers.slice(1).map((key, i) => (
              <Line
                key={i}
                type="monotone"
                dataKey={key}
                strokeWidth={2}
              />
            ))}
          </LineChart>
        )}
      </div>

      {/* 分析结果 */}
      <div style={{ marginTop: 20, whiteSpace: "pre-wrap" }}>
        <h3>分析结果：</h3>
        {analysis}
      </div>
    </div>
  );
}