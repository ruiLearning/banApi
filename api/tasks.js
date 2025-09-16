import { MongoClient, ObjectId } from "mongodb";

const uri = process.env.MONGODB_URI;

let client;
let clientPromise;

if (!global._mongoClientPromise) {
    client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    global._mongoClientPromise = client.connect();
}

clientPromise = global._mongoClientPromise;

export default async function handler(req, res) {
    // ========================
    // CORS 允许跨域
    // ========================
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") return res.status(200).end();

    try {
        const client = await clientPromise;
        const db = client.db("test");
        const collection = db.collection("todo");

        // ========================
        // GET → 查询任务
        // 支持树状结构排序
        // ========================
        if (req.method === "GET") {
            const tasks = await collection.find({}).toArray();

            // 排序逻辑：未完成 > 已完成 > 已删除
            const activeTasks = tasks.filter(t => !t.checked && !t.deleted);
            const completedTasks = tasks.filter(t => t.checked && !t.deleted);
            const deletedTasks = tasks.filter(t => t.deleted);

            // 合并并按创建时间排序
            const sortedTasks = [...activeTasks, ...completedTasks, ...deletedTasks].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

            return res.status(200).json(sortedTasks);
        }

            // ========================
            // POST → 增加/修改任务
        // ========================
        else if (req.method === "POST") {
            const { _id, title, checked, deleted, parentId } = req.body;

            // 新增任务
            if (!_id) {
                const level = parentId ? 1 : 0; // 默认子任务 level=1
                const result = await collection.insertOne({
                    title,
                    checked: checked || false,
                    deleted: deleted || false,
                    level,
                    parentId: parentId || null,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                return res.status(200).json({ success: true, _id: result.insertedId });
            }

            // 修改任务
            const filter = { _id: new ObjectId(_id) };
            const update = { updatedAt: new Date() };
            if (title) update.title = title;
            if (typeof checked === "boolean") update.checked = checked;
            if (typeof deleted === "boolean") update.deleted = deleted;
            if (parentId) update.parentId = parentId;

            const result = await collection.updateOne(filter, { $set: update });
            if (result.matchedCount === 0) return res.status(404).json({ error: "Task not found" });

            return res.status(200).json({ success: true });
        }

        else return res.status(405).json({ error: "Method Not Allowed" });

    } catch (err) {
        console.error("API Error:", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}
