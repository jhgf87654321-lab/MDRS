export const t = (key: string): string => {
  const dict: Record<string, string> = {
    'face': '面部特征', 'hair': '毛发设计', 'body': '肤色体型', 'style': '画面风格',
    'Caucasian': '白人', 'Asian': '亚洲人', 'African': '非洲人', 'Hispanic': '拉美裔', 'Middle Eastern': '中东人',
    'Blue': '蓝色', 'Brown': '棕色', 'Green': '绿色', 'Hazel': '浅褐色', 'Grey': '灰色',
    'Neutral': '平静', 'Happy': '开心', 'Serious': '严肃', 'Angry': '生气', 'Surprised': '惊讶', 'Smirk': '假笑',
    'Long wavy': '长大波浪', 'Short crop': '短平头', 'Buzz cut': '寸头', 'Ponytail': '马尾', 'Bald': '光头', 'Mohawk': '莫西干',
    'Blonde': '金发', 'Black': '黑发', 'Red': '红发', 'White': '白发',
    'Athletic': '运动型', 'Slim': '苗条', 'Muscular': '肌肉型', 'Average': '匀称', 'Curvy': '丰满',
    'Minimalist techwear': '极简科技装', 'Casual hoodie': '休闲卫衣', 'Formal suit': '正装西服', 'Cyberpunk armor': '赛博朋克装甲', 'T-shirt': 'T恤',
    'Cinematic Studio': '电影级影棚光', 'Neon Night': '霓虹夜光', 'Natural Sunlight': '自然日光', 'Dramatic Rim': '戏剧性轮廓光', 'Soft Diffuse': '柔和漫反射',
    'Close-up': '特写', 'Wide shot': '广角', 'Low angle': '仰视', 'High angle': '俯视', 'Profile': '侧脸',
    'MYTHOLOGICAL': '神话', 'ANIME': '动漫', 'FANTASY': '奇幻', 'PHOTOGRAPHY': '摄影', 'SKETCH': '素描', 'DIGITAL': '数字艺术', 'PIXEL ART': '像素艺术', 'ILLUSTRATION': '插画', '3D STYLES': '3D风格',
    'Oval': '椭圆脸', 'Round': '圆脸', 'Square': '方脸', 'Heart': '心形脸', 'Diamond': '菱形脸', 'Long': '长脸',
    'High': '挺拔', 'Medium': '中等', 'Low': '扁平',
    'Wide': '宽大', 'Narrow': '窄小',
    'Full': '丰满', 'Thin': '纤细', 'Bow-shaped': 'M型唇',
    'Almond': '杏仁眼', 'Monolid': '单眼皮', 'Hooded': '内双', 'Downturned': '垂眼', 'Upturned': '丹凤眼',
    'Arched': '挑眉', 'Straight': '平眉', 'Bushy': '浓眉', 'Thick': '粗眉',
    'Clean-shaven': '无胡须', 'Stubble': '胡渣', 'Full beard': '落腮胡', 'Goatee': '山羊胡', 'Mustache': '八字胡',
    'male': '男', 'female': '女', 'creature': '生物',
    'Fair': '白皙', 'Light': '浅色', 'Medium-Light': '中浅', 'Medium-Dark': '中深', 'Dark': '深色', 'Deep': '浓深', 'Ebony': '乌木',
    'virtual_restoration': '虚拟角色还原', 'upload_virtual': '上传虚拟形象', 'restoration_active': '还原模式已开启'
  };
  return dict[key] || key;
};
