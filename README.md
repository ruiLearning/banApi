# BanApi (Vercel + MongoDB Atlas)

这是一个最小可运行的 Todo API，适合在 Hexo 博客里调用。

## 部署步骤

1. 把 BanApi 上传到 GitHub
2. 在 [Vercel](https://vercel.com) 新建项目，选择 BanApi 仓库
3. 在 Vercel **Environment Variables** 添加：
   - `MONGODB_URI = mongodb+srv://<username>:<password>@cluster0.mongodb.net/hexo_todo?retryWrites=true&w=majority`
4. 部署完成后，访问：
   - `GET /api/tasks` → 获取任务
   - `POST /api/tasks` → 更新任务状态

数据库：`hexo_todo`  
集合：`tasks`
# BanApi
