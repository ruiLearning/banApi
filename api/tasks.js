import { MongoClient, ObjectId } from "mongodb";

const uri = process.env.MONGODB_URI;

// ✅ 新增: 安全检查，防止 URI 缺失导致 connect 卡死超时
if (!uri) {
  console.error("❌ Missing MONGODB_URI environment variable");
}

let client;
let clientPromise;

if (!global._mongoClientPromise) {
  client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  global._mongoClientPromise = client.connect().catch(err => {
    console.error("❌ MongoDB Connect Error:", err.message);
    return null; // 避免 Promise 永远 pending 导致超时
  });
}
clientPromise = global._mongoClientPromise;

export default async function handler(req, res) {
  // ✅ CORS headers（原逻辑不变，只允许跨域）
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Vary", "Origin"); // ✅ 新增
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const client = await clientPromise;
    if (!client) {
      return res.status(500).json({ error: "MongoDB connection failed" });
    }

    const db = client.db("test");
    const collection = db.collection("todo");

    if (req.method === "GET") {
      const tasks = await collection.find({}).toArray();
      return res.status(200).json(tasks);
    }

    if (req.method === "POST") {
      const { _id, title, checked, deleted, level, parentId, action } = req.body || {};

      if (action === "delete") {
        if (!_id) return res.status(400).json({ error: "Missing _id" });
        await collection.deleteOne({ _id: new ObjectId(_id) });
        return res.status(200).json({ success: true });
      }

      if (_id) {
        const filter = { _id: new ObjectId(_id) };
        const update = {};
        if (title) update.title = title;
        if (typeof checked === "boolean") update.checked = checked;
        if (typeof deleted === "boolean") update.deleted = deleted;
        await collection.updateOne(filter, { $set: update });
        return res.status(200).json({ success: true });
      }

      if (title) {
        const result = await collection.insertOne({
          title,
          checked: false,
          deleted: false,
          level: level || 0,
          parentId: parentId || null
        });
        return res.status(200).json({ success: true, _id: result.insertedId });
      }

      return res.status(400).json({ error: "Invalid request body" });
    }

    return res.status(405).json({ error: "Method Not Allowed" });
  } catch (err) {
    console.error("API Error:", err);
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
}
