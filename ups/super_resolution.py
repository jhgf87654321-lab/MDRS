
import cv2
import numpy as np
from PIL import Image
import io
import base64

class ImageSuperResolution:
    def __init__(self):
        pass
    
    def enhance_image(self, image_data, scale_factor=2):
        """
        使用OpenCV的超分辨率技术增强图像
        :param image_data: 原始图像数据
        :param scale_factor: 放大倍数，默认2倍
        :return: 增强后的图像数据
        """
        # 将base64数据转换为OpenCV图像
        image_bytes = base64.b64decode(image_data)
        np_arr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        
        # 使用插值方法进行图像放大
        height, width = img.shape[:2]
        new_dimensions = (width * scale_factor, height * scale_factor)
        
        # 使用高质量插值算法
        enhanced_img = cv2.resize(img, new_dimensions, interpolation=cv2.INTER_CUBIC)
        
        # 转换回base64格式
        _, buffer = cv2.imencode('.png', enhanced_img)
        enhanced_image_data = base64.b64encode(buffer).decode('utf-8')
        
        return enhanced_image_data
    
    def apply_denoising(self, image_data, strength=50):
        """
        应用降噪处理
        :param image_data: 图像数据
        :param strength: 降噪强度(0-100)
        :return: 降噪后的图像数据
        """
        image_bytes = base64.b64decode(image_data)
        np_arr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        
        # 应用双边滤波降噪
        denoised_img = cv2.bilateralFilter(img, 9, strength, strength)
        
        # 转换回base64格式
        _, buffer = cv2.imencode('.png', denoised_img)
        denoised_image_data = base64.b64encode(buffer).decode('utf-8')
        
        return denoised_image_data
