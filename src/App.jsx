import { useState, useRef } from "react";
import Papa from "papaparse";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceDot,
} from "recharts";

export default function App() {
  const [files, setFiles] = useState([]);
  const [raw, setRaw] = useState([]);
  const [windowData, setWindowData] = useState([]);

  const [index, setIndex] = useState(20);
  const [running, setRunning] = useState(false);

  const [anomalies, setAnomalies] = useState([]);
  const [popup, setPopup] = useState(null);

  const timer = useRef(null);

  // ================= CSV =================
  const handleFile = (e) => {
    const file = e.target.files[0];

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      complete: (res) => {
        const data = res.data.filter(Boolean);

        setFiles((prev) => [...prev, { name: file.name, data }]);
        setRaw(data);
        setWindowData(data.slice(0, 20));
        setIndex(20);
      },
    });
  };

  // ================= AI =================
  const callAI = async (slice) => {
    if (!slice.length) return;

    const structured = {};
    Object.keys(slice[0]).forEach((k) => {
      structured[k] = slice.map((d) => d[k]);
    });

    const res = await fetch("https://my-dashboard-5zjj.onrender.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: structured }),
    });

    const json = await res.json();

    const pts = [];

    slice.forEach((r, i) => {
      Object.keys(json.result).forEach((k) => {
        if (k === "time") return;

        const avg = json.result[k].avg;

        if (Math.abs(r[k] - avg) > avg * 0.4) {
          pts.push({
            index: i,
            time: r.time,
            key: k,
            value: r[k],
            reason: json.result[k].reason || "异常偏离均值",
            cause: json.result[k].cause || "设备波动或传感器异常",
            solution: json.result[k].solution || "检查设备或校准",
          });
        }
      });
    });

    setAnomalies(pts);
  };

  // ================= 播放 =================
  const start = () => {
    if (running) return;
    setRunning(true);

    timer.current = setInterval(() => {
      setIndex((i) => {
        const next = i + 1;

        if (next >= raw.length) {
          clearInterval(timer.current);
          setRunning(false);
          return i;
        }

        const slice = raw.slice(Math.max(0, next - 20), next);
        setWindowData(slice);
        callAI(slice);

        return next;
      });
    }, 700);
  };

  const stop = () => {
    setRunning(false);
    clearInterval(timer.current);
  };

  const seek = (v) => {
    setIndex(v);
    const slice = raw.slice(Math.max(0, v - 20), v);
    setWindowData(slice);
    callAI(slice);
  };

  const keys =
    windowData.length > 0
      ? Object.keys(windowData[0]).filter((k) => k !== "time")
      : [];

  return (
    <div className="app">

      {/* TOP */}
      <div className="topbar">
        <div className="title">🏭 Industrial Monitoring System</div>

        <div>
          <input type="file" onChange={handleFile} />
          <button onClick={start}>开始</button>
          <button onClick={stop}>停止</button>
        </div>
      </div>

      {/* MAIN */}
      <div className="main">

        {/* LEFT */}
        <div className="left">
          <h3>文件列表</h3>
          {files.map((f, i) => (
            <div key={i} className="fileItem">
              📄 {f.name}
            </div>
          ))}
        </div>

        {/* CENTER */}
        <div className="center">

          <ComposedChart width={900} height={450} data={windowData}>

            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Legend />

            {keys.map((k, i) => (
              <Line key={i} dataKey={k} stroke="#4f8cff" dot={false} />
            ))}

            {/* 🔴最终稳定红点（不会掉底 / 可点击） */}
            {anomalies.map((a, i) => {
              const p = windowData[a.index];
              if (!p) return null;

              return (
                <ReferenceDot
                  key={i}
                  x={p.time}
                  y={p[a.key]}
                  r={6}
                  fill="red"
                  stroke="white"
                  isFront={true}   // ⭐关键：永远在最上层
                  onClick={() => setPopup(a)}
                  style={{ cursor: "pointer" }}
                />
              );
            })}

          </ComposedChart>

          {/* 时间滑动 */}
          <input
            type="range"
            min={20}
            max={raw.length}
            value={index}
            onChange={(e) => seek(Number(e.target.value))}
          />

        </div>

        {/* RIGHT */}
        <div className="right">
          <h3>实时数据</h3>
          {windowData.map((r, i) => (
            <div key={i}>
              {r.time} | {r.temperature} | {r.pressure}
            </div>
          ))}
        </div>

      </div>

      {/* POPUP */}
      {popup && (
        <div className="popup" onClick={() => setPopup(null)}>
          <div className="popupBox" onClick={(e) => e.stopPropagation()}>

            <h3>🚨 异常分析</h3>

            <p>时间：{popup.time}</p>
            <p>变量：{popup.key}</p>
            <p>数值：{popup.value}</p>

            <hr />

            <p><b>原因：</b>{popup.reason}</p>
            <p><b>可能原因：</b>{popup.cause}</p>
            <p><b>处理：</b>{popup.solution}</p>

            <button onClick={() => setPopup(null)}>关闭</button>
          </div>
        </div>
      )}

    </div>
  );
}