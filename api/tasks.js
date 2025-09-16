import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

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
      const { _id, title, checked } = req.body;

      // 如果传了 _id → 更新任务
      if (_id) {
        await collection.updateOne(
            { _id },
            { $set: { checked } } // 这里只更新 checked 状态，如果需要更新 title 可以加 title
        );
        return res.status(200).json({ success: true });
      }
      // 没有 _id → 新增任务
      else if (title && typeof checked === "boolean") {
        const result = await collection.insertOne({ title, checked });
        return res.status(200).json({ success: true, _id: result.insertedId });
      }
      else {
        return res.status(400).json({ error: "Invalid request body" });
      }
    }
    else {
      return res.status(405).json({ error: "Method Not Allowed" });
    }
  } catch (err) {
    console.error("API Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
