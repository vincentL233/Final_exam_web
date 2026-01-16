var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var cors = require('cors');
var fileupload = require('express-fileupload');
var DB = require("nedb-promises");

var server = express();

// EJS 
server.set('view engine', 'ejs');
server.set('views', __dirname + '/views');

server.use(cors());

server.use(express.json());

server.use(express.static(__dirname + "/public"));

server.use(express.static(path.join(__dirname, '../my-portfolio/dist')));

server.use(bodyParser.urlencoded({ extended: true }));
server.use(fileupload({ limits: { fileSize: 2 * 1024 * 1024 } }));


var ServerDB = DB.create(__dirname + "/Service.db");
var portfolioDB = DB.create(__dirname + "/portfolio.db");
var contactDB = DB.create(__dirname + "/contact.db");


// ============ Services API ============
// 取得服務列表
server.get("/services", (req, res) => {
    ServerDB.find({})
        .then(results => {
            res.json(results);
        })
        .catch(err => {
            console.error("Error fetching services:", err);
            res.status(500).json({ error: "Failed to fetch services" });
        });
});

// 新增服務
server.post("/services", (req, res) => {
    ServerDB.insert(req.body)
        .then(newService => {
            res.json({ success: true, data: newService });
        })
        .catch(err => {
            console.error("Error adding service:", err);
            res.status(500).json({ success: false, error: "Failed to add service" });
        });
});

// ============ Portfolio API ============
// 取得作品集列表
server.get("/portfolio", (req, res) => {
    portfolioDB.find({})
        .then(results => {
            res.json(results);
        })
        .catch(err => {
            console.error("Error fetching portfolio:", err);
            res.status(500).json({ error: "Failed to fetch portfolio" });
        });
});

// 新增作品
server.post("/portfolio", (req, res) => {
    portfolioDB.insert(req.body)
        .then(newProject => {
            res.json({ success: true, data: newProject });
        })
        .catch(err => {
            console.error("Error adding portfolio item:", err);
            res.status(500).json({ success: false, error: "Failed to add portfolio item" });
        });
});

// ============ Contact API ============
//聯絡記錄管理 json
server.get("/contact", (req, res) => {
    contactDB.find({})
        .then(results => {
            res.json(results);
        })
        .catch(err => {
            console.error("Error fetching contacts:", err);
            res.status(500).json({ error: "Failed to fetch contacts" });
        });
});
// 聯絡記錄管理
server.get("/showContact", (req, res) => {
    res.redirect('/contact-admin.html');
});


server.post("/contact-form", (req, res) => {
    console.log("Received form data:", req.body);

    const { name, email, message } = req.body;
    if (!name || !email || !message) {
        return res.status(400).send("請填寫所有必要欄位");
    }

    const contactRecord = {
        name: name,
        email: email,
        message: message,
        service: req.body.service || 'General Inquiry',
        servicePrice: parseInt(req.body.servicePrice) || 0,
        createdAt: new Date().toISOString()
    };

    contactDB.insert(contactRecord)
        .then(result => {
            console.log("Contact saved:", result);
            res.render('contact-success', { contact: result });
        })
        .catch(error => {
            console.error("Error saving contact:", error);
            res.status(500).send("伺服器錯誤，請稍後再試");
        });
});


// 根據 ID 顯示成功頁面
server.get("/contact-success/:id", (req, res) => {
    contactDB.findOne({ _id: req.params.id })
        .then(contact => {
            if (!contact) {
                return res.status(404).send("找不到該筆記錄");
            }
            res.render('contact-success', { contact: contact });
        })
        .catch(error => {
            console.error("Error fetching contact:", error);
            res.status(500).send("伺服器錯誤");
        });
});


server.post("/contact", (req, res) => {
    console.log("Received contact data:", req.body);


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
    contactDB.insert(contactRecord)
        .then(result => {
            console.log("Contact saved:", result);

            res.json({
                success: true,
                message: "Thank you! Your message has been sent successfully.",
                data: result
            });
        })
        .catch(error => {
            console.error("Error saving contact:", error);
            res.status(500).json({
                success: false,
                message: "Server error. Please try again later."
            });
        });
});

// 聯絡表單 
server.post("/contact-with-file", (req, res) => {
 
    const contactRecord = {
        ...req.body,
        createdAt: new Date().toISOString()
    };
    contactDB.insert(contactRecord)
        .then(() => {
            res.json({ success: true, message: "Contact info saved!" });
        })
        .catch(error => {
            console.error("Error in contact-with-file:", error);
            res.status(500).json({ success: false, message: "Server Error" });
        });
});

// 刪除聯絡記錄 
server.delete("/contact/:id", (req, res) => {
    contactDB.remove({ _id: req.params.id })
        .then(numRemoved => {
            if (numRemoved > 0) {
                res.json({ success: true, message: "Contact deleted" });
            } else {
                res.status(404).json({ success: false, message: "Contact not found" });
            }
        })
        .catch(error => {
            console.error("Error deleting contact:", error);
            res.status(500).json({ success: false, message: "Server Error" });
        });
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