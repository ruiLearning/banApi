// 导入 MongoDB 官方客户端
import {MongoClient, ObjectId} from "mongodb";

// 从环境变量获取 MongoDB 连接字符串
const uri = process.env.MONGODB_URI;

// 使用全局缓存，避免 Vercel Serverless 每次执行都新建连接
let client;
let clientPromise;

if (!global._mongoClientPromise) {
    client = new MongoClient(uri, {
        useNewUrlParser: true,    // 使用新的 URL 解析器
        useUnifiedTopology: true  // 使用统一拓扑结构
    });
    global._mongoClientPromise = client.connect();
}

clientPromise = global._mongoClientPromise;

// 导出 Serverless 函数处理请求
export default async function handler(req, res) {
    // =======================
    // 添加 CORS 头
    // =======================
    res.setHeader("Access-Control-Allow-Origin", "*"); // 允许所有域名访问
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // 处理预检请求
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    try {
        const client = await clientPromise;
        const db = client.db("test");           // 数据库名，可自定义
        const collection = db.collection("todo"); // 集合名，可自定义

        // =======================
        // GET 请求 → 获取所有任务
        // =======================
        if (req.method === "GET") {
            const tasks = await collection.find({}).toArray();
            return res.status(200).json(tasks);
        }

            // =======================
            // POST 请求 → 更新或新增任务
        // =======================
        else if (req.method === "POST") {
            const {_id, title, checked} = req.body;

            // 如果传了 _id → 更新任务
            if (_id) {
                const filter = {_id: new ObjectId(_id)}; // ObjectId 类型
                const update = {};
                if (typeof checked === "boolean") update.checked = checked;
                if (title) update.title = title;           // 如果前端也想更新标题

                const result = await collection.updateOne(filter, {$set: update});

                if (result.matchedCount === 0) {
                    return res.status(404).json({error: "Task not found"});
                }

                return res.status(200).json({success: true});
            }
            // 没有 _id → 新增任务
            else if (title && typeof checked === "boolean") {
                const result = await collection.insertOne({title, checked});
                return res.status(200).json({success: true, _id: result.insertedId});
            } else {
                return res.status(400).json({error: "Invalid request body"});
            }
        } else {
            return res.status(405).json({error: "Method Not Allowed"});
        }
    } catch (err) {
        console.error("API Error:", err);
        return res.status(500).json({error: "Internal Server Error"});
    }
}
