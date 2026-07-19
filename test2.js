const jwt = require("jsonwebtoken");
const token = jwt.sign({ id: "bbd474bf-6833-4576-869d-874442493152", username: "dakshit", role: "master", status: "approved" }, "supersecret123", { expiresIn: "7d" });

const run = async () => {
    const fetchWithToken = async (url) => {
        const res = await fetch("http://localhost:3000" + url, { headers: { Authorization: "Bearer " + token }});
        return { ok: res.ok, status: res.status, data: await res.json().catch(()=>"failed to parse JSON") };
    };

    console.log("users:", await fetchWithToken("/api/users"));
    console.log("logs:", await fetchWithToken("/api/admin/notifications/logs"));
    console.log("analytics:", await fetchWithToken("/api/admin/analytics"));
    console.log("settings:", await fetchWithToken("/api/admin/settings"));
    console.log("audit:", await fetchWithToken("/api/admin/audit_logs"));
};
run();
