var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var cors = require('cors'); // [新增] 讓 Vue 可以跨網域請求
var fileupload = require('express-fileupload');
var DB = require("nedb-promises");

var server = express();

// [新增] 設定 EJS 模板引擎
server.set('view engine', 'ejs');
server.set('views', __dirname + '/views');

// [新增] 啟用 CORS，允許所有來源連線 (開發方便)
server.use(cors());

// [新增] 解析 JSON 格式的請求 (Vue 預設送 JSON)
server.use(express.json());

// 保留原本的設定
server.use(express.static(__dirname + "/public"));

// [新增] 部署: 設定 Vue 靜態檔案目錄 (../my-portfolio/dist)
server.use(express.static(path.join(__dirname, '../my-portfolio/dist')));

server.use(bodyParser.urlencoded({ extended: true }));
server.use(fileupload({ limits: { fileSize: 2 * 1024 * 1024 } }));

// 資料庫設定 (使用 nedb-promises)
var ServerDB = DB.create(__dirname + "/Service.db");
var portfolioDB = DB.create(__dirname + "/portfolio.db");
var contactDB = DB.create(__dirname + "/contact.db");


// ============ Services API ============
// 取得服務列表
server.get("/services", async (req, res) => {
    try {
        const results = await ServerDB.find({});
        res.json(results);
    } catch (err) {
        console.error("Error fetching services:", err);
        res.status(500).json({ error: "Failed to fetch services" });
    }
});

// 新增服務
server.post("/services", async (req, res) => {
    try {
        const newService = await ServerDB.insert(req.body);
        res.json({ success: true, data: newService });
    } catch (err) {
        console.error("Error adding service:", err);
        res.status(500).json({ success: false, error: "Failed to add service" });
    }
});

// ============ Portfolio API ============
// 取得作品集列表
server.get("/portfolio", async (req, res) => {
    try {
        const results = await portfolioDB.find({});
        res.json(results);
    } catch (err) {
        console.error("Error fetching portfolio:", err);
        res.status(500).json({ error: "Failed to fetch portfolio" });
    }
});

// 新增作品
server.post("/portfolio", async (req, res) => {
    try {
        const newProject = await portfolioDB.insert(req.body);
        res.json({ success: true, data: newProject });
    } catch (err) {
        console.error("Error adding portfolio item:", err);
        res.status(500).json({ success: false, error: "Failed to add portfolio item" });
    }
});

// ============ Contact API ============
// 取得所有聯絡記錄 (JSON)
server.get("/contact", async (req, res) => {
    try {
        const results = await contactDB.find({});
        res.json(results);
    } catch (err) {
        console.error("Error fetching contacts:", err);
        res.status(500).json({ error: "Failed to fetch contacts" });
    }
});

// 📋 顯示所有聯絡記錄 (重定向到靜態 HTML 頁面)
server.get("/showContact", (req, res) => {
    res.redirect('/contact-admin.html');
});

// ============ 傳統表單提交 (渲染 EJS 成功頁面) ============
server.post("/contact-form", async (req, res) => {
    try {
        console.log("Received form data:", req.body);

        // 驗證必要欄位
        const { name, email, message } = req.body;
        if (!name || !email || !message) {
            return res.status(400).send("請填寫所有必要欄位");
        }

        // 建立聯絡記錄物件
        const contactRecord = {
            name: name,
            email: email,
            message: message,
            service: req.body.service || 'General Inquiry',
            servicePrice: parseInt(req.body.servicePrice) || 0,
            createdAt: new Date().toISOString()
        };

        // 存入資料庫
        const result = await contactDB.insert(contactRecord);
        console.log("Contact saved:", result);

        // 使用 EJS 渲染成功頁面
        res.render('contact-success', { contact: result });

    } catch (error) {
        console.error("Error saving contact:", error);
        res.status(500).send("伺服器錯誤，請稍後再試");
    }
});

// ============ 成功頁面 (EJS 渲染) ============
// 根據 ID 顯示成功頁面
server.get("/contact-success/:id", async (req, res) => {
    try {
        const contact = await contactDB.findOne({ _id: req.params.id });
        if (!contact) {
            return res.status(404).send("找不到該筆記錄");
        }
        res.render('contact-success', { contact: contact });
    } catch (error) {
        console.error("Error fetching contact:", error);
        res.status(500).send("伺服器錯誤");
    }
});

// 提交聯絡表單 (接收 JSON 資料 - Vue 前端用)
server.post("/contact", async (req, res) => {
    try {
        console.log("Received contact data:", req.body);

        // 驗證必要欄位
        const { name, email, message } = req.body;
        if (!name || !email || !message) {
            return res.status(400).json({
                success: false,
                message: "Name, email, and message are required"
            });
        }

        // 建立聯絡記錄物件
        const contactRecord = {
            name: name,
            email: email,
            message: message,
            service: req.body.service || null,
            servicePrice: req.body.servicePrice || 0,
            createdAt: new Date().toISOString()
        };

        // 存入資料庫
        const result = await contactDB.insert(contactRecord);
        console.log("Contact saved:", result);

        res.json({
            success: true,
            message: "Thank you! Your message has been sent successfully.",
            data: result
        });

    } catch (error) {
        console.error("Error saving contact:", error);
        res.status(500).json({
            success: false,
            message: "Server error. Please try again later."
        });
    }
});

// 聯絡表單 (支援檔案上傳)
server.post("/contact-with-file", async (req, res) => {
    try {
        // 1. 存入資料庫
        const contactRecord = {
            ...req.body,
            createdAt: new Date().toISOString()
        };
        await contactDB.insert(contactRecord);

        // 2. 處理檔案上傳 (如果有檔案的話)
        if (req.files && req.files.myFile1) {
            var upfile = req.files.myFile1;
            // 移動檔案
            upfile.mv(__dirname + "/public/uploads/" + upfile.name, function (err) {
                if (err) {
                    return res.status(500).json({ success: false, message: err.toString() });
                }
                res.json({ success: true, message: "File uploaded: " + upfile.name });
            });
        } else {
            res.json({ success: true, message: "Contact info saved!" });
        }
    } catch (error) {
        console.error("Error in contact-with-file:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// 刪除聯絡記錄 
server.delete("/contact/:id", async (req, res) => {
    try {
        const numRemoved = await contactDB.remove({ _id: req.params.id });
        if (numRemoved > 0) {
            res.json({ success: true, message: "Contact deleted" });
        } else {
            res.status(404).json({ success: false, message: "Contact not found" });
        }
    } catch (error) {
        console.error("Error deleting contact:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// [新增] 前端路由支援: 當 API 沒接到請求時，回傳 index.html
server.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../my-portfolio/dist/index.html'));
});

server.listen(8080, () => {
    console.log("=================================");
    console.log("Server is running on http://localhost:8080");
    console.log("=================================");
    console.log("Available API endpoints:");
    console.log("  GET  /services     - Get all services");
    console.log("  POST /services     - Add a service");
    console.log("  GET  /portfolio    - Get all portfolio items");
    console.log("  POST /portfolio    - Add a portfolio item");
    console.log("  GET  /contact      - Get all contacts");
    console.log("  POST /contact      - Submit contact form");
    console.log("=================================");
});