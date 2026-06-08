# CoupleSpace 部署说明文档

本项目打包后为静态资源，可直接部署在您的阿里云服务器上，使用 Nginx 进行反向代理与静态资源托管。

> [!WARNING]
> **浏览器安全策略警告（非常重要）：**
> 现代浏览器（iOS Safari, Android Chrome, 微信内置浏览器等）的安全规则限制：**录音 API (MediaRecorder) 和摄像头调用仅在安全上下文 (Secure Context) 下可用**。
> 也就是说，**您必须为域名配置 SSL (HTTPS) 证书**。如果是普通 HTTP 链接，心事箱中的录音功能将直接被浏览器禁用！

---

## 1. 前端打包构建

在项目根目录下执行打包命令：
```bash
npm run build
```
打包成功后，会在根目录下生成 `dist/` 文件夹。这就是您需要上传至阿里云服务器的静态文件目录。

---

## 2. Nginx 配置参考

在您的阿里云服务器上，编辑 Nginx 配置文件（通常位于 `/etc/nginx/nginx.conf` 或 `/etc/nginx/conf.d/couplespace.conf`）。

以下是推荐的 Nginx 服务配置（支持 PWA 路由回退、静态资源缓存和 HTTPS 安全连接）：

```nginx
server {
    listen 80;
    server_name yourdomain.com; # 替换为您的域名
    
    # 强制将 HTTP 请求重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com; # 替换为您的域名

    # SSL 证书配置 (使用您在阿里云申请的免费/收费证书)
    ssl_certificate /etc/nginx/ssl/yourdomain.pem;
    ssl_certificate_key /etc/nginx/ssl/yourdomain.key;
    
    ssl_session_timeout 5m;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:HIGH:!aNULL:!MD5:!RC4:!DHE;
    ssl_prefer_server_ciphers on;

    # 静态资源根路径 (指向 dist 文件夹解压后的物理路径)
    root /var/www/couplespace/dist;
    index index.html;

    # 开启 Gzip 压缩，加快加载速度
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_min_length 1000;

    location / {
        # 支持 React Router 的单页应用路由跳转 (防刷新 404)
        try_files $uri $uri/ /index.html;
    }

    # 静态多媒体资源缓存，减小服务器压力
    location ~* \.(?:ico|css|js|gif|jpe?g|png|svg|woff2?|eot|ttf|mp4|webm)$ {
        expires 7d;
        add_header Cache-Control "public, no-transform";
    }

    # 禁用 SW (Service Worker) 缓存，确保新版代码发布后能即时更新
    location = /sw.js {
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
    }
}
```

---

## 3. Supabase 环境准备

在您发布前，请务必建立 `.env` 文件。
在本地开发或在编译构建时，需在项目根目录创建一个名为 `.env` 的文件，写入您的 Supabase Credentials：

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

*注意：Vite 构建时会把 `VITE_` 前缀的变量硬编码嵌入到最终打包的静态 JavaScript 文件中。*
