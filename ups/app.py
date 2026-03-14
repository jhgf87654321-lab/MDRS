
from flask import Flask, request, jsonify, render_template
from super_resolution import ImageSuperResolution
import base64
import os

app = Flask(__name__)
sr = ImageSuperResolution()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/enhance', methods=['POST'])
def enhance_image():
    try:
        data = request.get_json()
        image_data = data.get('image')
        scale_factor = int(data.get('scale', 2))
        denoise_strength = int(data.get('denoise', 50))
        
        # 移除 data URL 前缀，只保留 base64
        if isinstance(image_data, str) and ',' in image_data:
            image_data = image_data.split(',', 1)[1]
        
        # 图像增强处理
        enhanced_data = sr.enhance_image(image_data, scale_factor)
        
        # 应用降噪处理
        if denoise_strength > 0:
            enhanced_data = sr.apply_denoising(enhanced_data, denoise_strength)
        
        return jsonify({
            'success': True,
            'enhanced_image': f'data:image/png;base64,{enhanced_data}',
            'message': '图像处理完成'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'处理失败: {str(e)}'
        }), 500

@app.route('/api/health')
def health_check():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
