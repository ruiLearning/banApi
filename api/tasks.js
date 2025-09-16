import { MongoClient, ObjectId } from "mongodb";

const uri = process.env.MONGODB_URI;

let client;
let clientPromise;

if(!global._mongoClientPromise){
    client = new MongoClient(uri, { useNewUrlParser:true, useUnifiedTopology:true });
    global._mongoClientPromise = client.connect();
}
clientPromise = global._mongoClientPromise;

export default async function handler(req,res){
    // CORS
    res.setHeader("Access-Control-Allow-Origin","*");
    res.setHeader("Access-Control-Allow-Methods","GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers","Content-Type");
    if(req.method==="OPTIONS") return res.status(200).end();

    try{
        const client = await clientPromise;
        const db = client.db("test");
        const collection = db.collection("todo");

        // GET → 查询全部任务
        if(req.method==="GET"){
            const tasks = await collection.find({}).toArray();
            return res.status(200).json(tasks);
        }

        // POST → 新增或修改
        else if(req.method==="POST" && !req.url.endsWith("/delete")){
            const { _id, title, checked, deleted, level, parentId } = req.body;
            if(_id){ // 更新
                const filter = { _id:new ObjectId(_id) };
                const update = {};
                if(title) update.title=title;
                if(typeof checked==="boolean") update.checked=checked;
                if(typeof deleted==="boolean") update.deleted=deleted;
                await collection.updateOne(filter, {$set:update});
                return res.status(200).json({ success:true });
            } else if(title){
                const result = await collection.insertOne({ title, checked:false, deleted:false, level:level||0, parentId:parentId||null });
                return res.status(200).json({ success:true, _id: result.insertedId });
            } else {
                return res.status(400).json({ error:"Invalid request body" });
            }
        }

        // POST /delete → 真实删除
        else if(req.method==="POST" && req.url.endsWith("/delete")){
            const { _id } = req.body;
            if(!_id) return res.status(400).json({ error:"Missing _id" });
            const result = await collection.deleteOne({ _id:new ObjectId(_id) });
            if(result.deletedCount===0) return res.status(404).json({ error:"Task not found" });
            return res.status(200).json({ success:true });
        }

        else return res.status(405).json({ error:"Method Not Allowed" });

    }catch(err){
        console.error(err);
        return res.status(500).json({ error:"Internal Server Error" });
    }
}
