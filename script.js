// ====== Cấu hình broker EMQX Cloud ======
// Trình duyệt không dùng được cổng 8883 (MQTT TLS), phải dùng WebSocket TLS cổng 8084
const MQTT_HOST = "k881181d.ala.asia-southeast1.emqxsl.com";
const MQTT_URL = "wss://" + MQTT_HOST + ":8084/mqtt";
const MQTT_USER = "admin";
const MQTT_PASS = "Y649394$y";

const TOPIC_LAMP = "esp32/lamp";            // gửi lệnh + nhận lệnh
const TOPIC_STATUS = "esp32/lamp/status";   // ESP32 báo trạng thái thật (ON/OFF)

// ====== Các phần tử trên trang ======
const panel = document.getElementById("panel");
const lampText = document.getElementById("lampText");
const hint = document.getElementById("hint");
const toggleBtn = document.getElementById("toggleBtn");
const conn = document.getElementById("conn");
const connText = document.getElementById("connText");

let lampOn = false;

// ====== Hiển thị trạng thái đèn ======
function showLamp(on) {
  lampOn = on;
  panel.dataset.lamp = on ? "on" : "off";
  lampText.textContent = on ? "Đèn đang sáng" : "Đèn đang tắt";
  hint.textContent = on
    ? "Bấm nút bên dưới để tắt đèn ở ESP32."
    : "Bấm nút bên dưới để bật đèn ở ESP32.";
  toggleBtn.textContent = on ? "Tắt đèn" : "Bật đèn";
}

function showConnection(state, text) {
  conn.dataset.state = state;
  connText.textContent = text;
  toggleBtn.disabled = state !== "online";
}

// ====== Kết nối MQTT ======
const client = mqtt.connect(MQTT_URL, {
  username: MQTT_USER,
  password: MQTT_PASS,
  clientId: "web_" + Math.random().toString(16).slice(2, 10),
  clean: true,
  reconnectPeriod: 3000,
  connectTimeout: 10000
});

client.on("connect", () => {
  showConnection("online", "Đã kết nối broker");
  client.subscribe([TOPIC_LAMP, TOPIC_STATUS], (err) => {
    if (err) console.error("Lỗi subscribe:", err);
  });
});

client.on("reconnect", () => showConnection("connecting", "Đang kết nối lại…"));
client.on("offline", () => showConnection("offline", "Mất kết nối broker"));
client.on("error", (err) => {
  console.error("Lỗi MQTT:", err);
  showConnection("offline", "Lỗi kết nối: kiểm tra user/mật khẩu");
});

// ====== Nhận tin nhắn ======
client.on("message", (topic, payload) => {
  const text = payload.toString();

  if (topic === TOPIC_LAMP) {
    // Dạng {"led": "on"} hoặc {"led": "off"}
    try {
      const data = JSON.parse(text);
      const value = String(data.led).toLowerCase();
      if (value === "on") showLamp(true);
      else if (value === "off") showLamp(false);
    } catch (e) {
      console.warn("Không đọc được JSON:", text);
    }
  }

  if (topic === TOPIC_STATUS) {
    // ESP32 báo lại "ON" hoặc "OFF"
    const value = text.trim().toUpperCase();
    if (value === "ON") showLamp(true);
    else if (value === "OFF") showLamp(false);
  }
});

// ====== Nút bật/tắt: gửi JSON lên topic esp32/lamp ======
toggleBtn.addEventListener("click", () => {
  const next = lampOn ? "off" : "on";
  const message = JSON.stringify({ led: next });
  client.publish(TOPIC_LAMP, message, { qos: 0 });
});

showLamp(false);
showConnection("connecting", "Đang kết nối broker…");
