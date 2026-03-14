# 在 CloudBase 云托管部署 ups（OpenCV 放大服务）

## 一、准备代码包

在本地 `ups` 目录下确认包含：

- `Dockerfile`
- `requirements.txt`
- `app.py`
- `super_resolution.py`
- `templates/index.html`

将整个 `ups` 文件夹**打成 ZIP**（不要包含虚拟环境、`__pycache__`、`.git`）：

- Windows：选中 `ups` 内全部文件 → 右键「发送到」→「压缩(zipped)文件夹」，得到 `ups.zip`。
- 或命令行：在 `d:\NFTT` 下执行  
  `powershell Compress-Archive -Path ups\* -DestinationPath ups.zip`

## 二、在 CloudBase 控制台创建服务

1. 打开 [腾讯云 CloudBase 控制台](https://console.cloud.tencent.com/tcb)，选择你的环境。
2. 左侧进入 **云托管（Cloud Run）** → **服务管理** → **新建服务**。
3. **服务名称**：例如 `ups` 或 `upscale`。
4. **部署方式**：选择 **从代码包构建**（或「上传代码」），上传上一步的 `ups.zip`。
5. **端口**：填 **8080**（与 Dockerfile 中 `PORT=8080` 一致）。
6. **CPU / 内存**：建议至少 0.5 核、1GB，避免构建或运行时 OOM。
7. 提交创建，等待镜像构建并首次部署完成。

## 三、获取公网访问地址

1. 在云托管 → 该服务 → **版本管理** 中，确认最新版本状态为「运行中」。
2. 在 **服务配置** 或 **访问方式** 中打开 **公网访问**，复制提供的访问地址，形如：  
   `https://ups-xxxxx.ap-shanghai.run.tcloudbase.com`  
   或  
   `https://ups-xxxxx.gz.apigw.tencentcs.com/...`（若经 API 网关）。
3. 记下**根地址**（不要带路径），例如：  
   `https://ups-xxxxx.ap-shanghai.run.tcloudbase.com`

## 四、在 Vercel 中配置

1. 打开 Vercel 项目 → **Settings** → **Environment Variables**。
2. 新增变量：
   - **Name**：`CLOUD_UPSCALE_URL`
   - **Value**：上一步的根地址，例如  
     `https://ups-xxxxx.ap-shanghai.run.tcloudbase.com`
3. 保存后重新部署前端，使新环境变量生效。

## 五、校验

- 浏览器访问：`https://你的ups地址/` → 应打开 ups 的图片上传页面。
- 健康检查：`https://你的ups地址/api/health` → 应返回 `{"status":"ok"}`。
- 在 NFT 站点点击「生成 2K」：应走 OpenCV 放大并正常写入 Wardrobe（无水印）。

## 常见问题

- **构建失败**：查看云托管构建日志，确认 Dockerfile、requirements.txt 和目录结构无误；若内存不足，可适当提高构建环境内存。
- **运行 502/超时**：确认服务端口为 8080，且容器内 `PORT=8080`；若控制台配置的端口不是 8080，在云托管「环境变量」中增加 `PORT=你配置的端口`。
- **跨域**：Vercel 前端请求云托管为跨域；若遇 CORS 错误，需在 `app.py` 中为 Flask 增加 CORS 响应头（例如使用 `flask-cors` 或手动加 `Access-Control-Allow-Origin`）。
