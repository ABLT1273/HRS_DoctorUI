# 医院挂号系统-医生端部署指南

## 生产环境部署说明

### 1. 构建前端应用

在项目根目录下执行以下命令构建生产版本：

```bash
npm run build
```

构建完成后，所有静态文件将生成在 `dist` 目录下。

### 2. 服务器配置

#### 2.1 Nginx配置示例

以下是一个Nginx配置示例，用于在生产环境中部署前端应用并代理API请求：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /path/to/your/project/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API请求代理到后端服务器
    location /api {
        proxy_pass http://localhost:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### 2.2 Apache配置示例

如果使用Apache服务器，可以使用以下配置：

```apache
<VirtualHost *:80>
    ServerName your-domain.com
    DocumentRoot /path/to/your/project/dist

    # 启用重写引擎
    RewriteEngine On

    # 处理前端路由
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]

    # 代理API请求
    ProxyPreserveHost On
    ProxyPass /api http://localhost:8081/api
    ProxyPassReverse /api http://localhost:8081/api
</VirtualHost>
```

### 3. 环境变量配置

生产环境的环境变量配置已设置为相对路径 `/doctor`，确保API请求通过服务器代理转发到后端。

### 4. 注意事项

1. **CORS配置**：确保后端服务器的CORS配置允许生产环境的域名访问
2. **HTTPS**：在生产环境中建议使用HTTPS协议
3. **静态资源缓存**：可以配置适当的缓存策略以提高性能
4. **安全设置**：确保服务器安全配置，防止未授权访问

### 5. 故障排除

如果遇到API请求失败的问题，请检查：

1. 服务器代理配置是否正确
2. 后端服务器是否正常运行
3. 网络连接是否正常
4. 浏览器控制台是否有错误信息

### 6. 更新部署

当需要更新应用时：

1. 重新构建应用：`npm run build`
2. 将新的 `dist` 目录内容替换服务器上的旧文件
3. 重启服务器（如果需要）

如有其他部署相关问题，请联系开发团队。
