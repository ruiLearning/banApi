// 导入 MongoDB 官方客户端
import { MongoClient } from "mongodb";

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
  try {
    const client = await clientPromise;
    const db = client.db("test");           // 数据库名，可自定义
    const collection = db.collection("todo"); // 集合名，可自定义

    // ========================
    // GET 请求 → 获取所有任务
    // ========================
    if (req.method === "GET") {
      const tasks = await collection.find({}).toArray(); // 查询全部文档
      return res.status(200).json(tasks);                // 返回 JSON 数组
    }

        // ========================
        // POST 请求 → 新增或更新任务
    // ========================
    else if (req.method === "POST") {
      const { _id, title, checked } = req.body;         // 从请求 body 获取字段

      // 简单校验，确保字段存在
      if (!_id || typeof checked !== "boolean" || !title) {
        return res.status(400).json({ error: "Invalid request body" });
      }

      // 更新任务，如果 _id 不存在就插入
      await collection.updateOne(
          { _id: _id },               // 根据 _id 查找文档
          { $set: { title, checked } }, // 同时更新 title 和 checked
          { upsert: true }            // 不存在时插入
      );

      return res.status(200).json({ success: true });
    }

        // ========================
        // 其他请求方法 → 返回 405
    // ========================
    else {
      return res.status(405).json({ error: "Method Not Allowed" });
    }
  } catch (err) {
    console.error("API Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
