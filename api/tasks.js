import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

// 使用全局缓存，避免 Vercel Serverless 每次执行都新建连接
let client;
let clientPromise;

if (!global._mongoClientPromise) {
  client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  global._mongoClientPromise = client.connect();
}

clientPromise = global._mongoClientPromise;

export default async function handler(req, res) {
  try {
    const client = await clientPromise;
    const db = client.db("test");   // 数据库名，可自定义
    const collection = db.collection("todo");

    if (req.method === "GET") {
      // 获取任务
      const tasks = await collection.find({}).toArray();
      res.status(200).json(tasks);
    } else if (req.method === "POST") {
      // 更新任务状态
      const { id, checked } = req.body;
      await collection.updateOne(
        { _id: id },
        { $set: { checked } },
        { upsert: true }
      );
      res.status(200).json({ success: true });
    } else {
      res.status(405).json({ error: "Method Not Allowed" });
    }
  } catch (err) {
    console.error("API Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
