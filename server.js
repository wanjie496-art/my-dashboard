import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

console.log("🚀 AI工业服务器：http://localhost:3000");

// =====================
// 📊 AI分析函数
// =====================
function analyze(data) {
  const result = {};

  for (const key in data) {
    if (key === "time") continue;

    const values = data[key]
      .map(Number)
      .filter(v => !isNaN(v));

    if (values.length < 2) continue;

    const avg =
      values.reduce((a, b) => a + b, 0) / values.length;

    const max = Math.max(...values);
    const min = Math.min(...values);

    const normalMin = avg * 0.8;
    const normalMax = avg * 1.2;

    const abnormalCount = values.filter(
      v => Math.abs(v - avg) > avg * 0.5
    ).length;

    result[key] = {
      avg: +avg.toFixed(2),
      max,
      min,
      normalRange: {
        min: +normalMin.toFixed(2),
        max: +normalMax.toFixed(2),
      },
      abnormalCount,
      status:
        abnormalCount > 0
          ? "⚠ 异常波动"
          : "✅ 稳定运行",
      suggestion:
        abnormalCount > 0
          ? "建议检查设备负载或传感器"
          : "运行正常",
    };
  }

  return result;
}

// =====================
// 📡 API
// =====================
app.post("/analyze", (req, res) => {
  try {
    const result = analyze(req.body.data);

    res.json({
      success: true,
      result,
      timestamp: Date.now(),
    });

  } catch (e) {
    res.status(500).json({ error: "analysis failed" });
  }
});

app.listen(3000, () => {
  console.log("✅ Server running");
});