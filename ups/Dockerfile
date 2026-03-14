# CloudBase 云托管容器：OpenCV 图像放大服务
FROM python:3.11-slim

WORKDIR /app

# opencv-python-headless 无需系统 GUI 库，直接安装 Python 依赖即可
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY super_resolution.py .
COPY app.py .
COPY templates/ templates/

# 云托管默认可用 8080，若控制台配置为 5000 则一致
ENV PORT=8080
EXPOSE 8080

CMD ["sh", "-c", "python app.py"]
