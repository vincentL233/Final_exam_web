var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors'); // [新增] 讓 Vue 可以跨網域請求
var fileupload = require('express-fileupload');
var DB = require("nedb-promises");

var server = express();

// [新增] 啟用 CORS，允許所有來源連線 (開發方便)
server.use(cors());

// [新增] 解析 JSON 格式的請求 (Vue 預設送 JSON)
server.use(express.json());

// 保留原本的設定
server.use(express.static(__dirname + "/public"));
server.use(bodyParser.urlencoded({extended: true}));
server.use(fileupload({limits:{fileSize: 2 * 1024 * 1024}}));

// 資料庫設定 (保留)
var ServerDB = DB.create(__dirname + "/Service.db");
var portfolioDB = DB.create(__dirname + "/portfolio.db");
var contactDB = DB.create(__dirname + "/contact.db");

// 測試路由
server.get("/", (req, res) => {
    res.send("API Server is running!");
})

// [保留] 取得服務列表 API
server.get("/services", (req, res) => {
    ServerDB.find({}, {"_id": 0}).then(results => {
        res.json(results);
    }).catch(err => {
        console.log(err);
        res.status(500).json({ error: err });
    })
});

// [刪除] /showService 路由 (因為這是回傳 HTML 的，Vue 不需要)

// [保留] 取得作品集 API
server.get("/portfolio", (req, res) => {
    portfolioDB.find({}, {"_id": 0}).then(results => {
        res.json(results);
    }).catch(err => {
        console.log(err);
        res.status(500).json({ error: err });
    })
});

// [修改] 聯絡我們 API (包含檔案上傳)
server.post("/contact", async (req, res) => {
    try {
        // 1. 存入資料庫
        await contactDB.insert(req.body);

        // 2. 處理檔案上傳 (如果有檔案的話)
        if (req.files && req.files.myFile1) {
            var upfile = req.files.myFile1;
            // 移動檔案
            upfile.mv(__dirname + "/public/uploads/" + upfile.name, function(err) {
                if (err) {
                    // [修改] 失敗回傳 JSON
                    return res.status(500).json({ success: false, message: err });
                }
                // [修改] 成功回傳 JSON
                res.json({ success: true, message: "I got a file " + upfile.name });
            });
        } else {
            // 如果沒有檔案，直接回傳成功
            res.json({ success: true, message: "Contact info saved!" });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

server.listen(8080, () => {
    console.log("Server is running on http://localhost:8080");
});