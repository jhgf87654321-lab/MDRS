import React from 'react';
import { CharacterAttributes } from '../types';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { ChevronDown, ChevronUp, Plus, Camera, Cpu, X, ImagePlus } from 'lucide-react';
import { t } from '../lib/translations';

interface CustomizationPanelProps {
  attributes: CharacterAttributes;
  onChange: (attrs: CharacterAttributes) => void;
  onGenerate: () => void;
  onInterrogate: (file: File) => void;
  isGenerating: boolean;
}

const categories = [
  { id: 'face', label: '面部特征' },
  { id: 'hair', label: '毛发设计' },
  { id: 'body', label: '肤色体型' },
  { id: 'scene', label: '场景氛围' },
];

const getSkinColor = (tone: string) => {
  const colors: Record<string, string> = {
    'Fair': '#f9ebe0',
    'Light': '#f3d6c1',
    'Medium-Light': '#e6b999',
    'Medium': '#d3a17e',
    'Medium-Dark': '#b97d5a',
    'Dark': '#8d5531',
    'Deep': '#613d23',
    'Ebony': '#3d2314'
  };
  return colors[tone] || '#f9ebe0';
};

export function CustomizationPanel({ attributes, onChange, onGenerate, onInterrogate, isGenerating }: CustomizationPanelProps) {
  const [activeCategory, setActiveCategory] = React.useState('face');
  const interrogateInputRef = React.useRef<HTMLInputElement>(null);
  const virtualInputRef = React.useRef<HTMLInputElement>(null);
  const referenceInputRef = React.useRef<HTMLInputElement>(null);

  const updateAttr = (key: keyof CharacterAttributes, value: any) => {
    onChange({ ...attributes, [key]: value });
  };

  const handleInterrogateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onInterrogate(file);
    }
  };

  const handleVirtualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange({
          ...attributes,
          isVirtualRestoration: true,
          virtualImage: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange({
          ...attributes,
          referenceImage: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="w-[400px] bg-white border-r border-black/5 flex flex-col p-8 z-40 h-full">
      <div className="flex items-start justify-between mb-12">
        <div className="flex flex-col gap-1 w-full mr-4">
          <h2 className="text-black text-2xl font-display font-bold tracking-tight">
            模特定制与库
          </h2>
          <p className="text-black/40 text-[10px] font-bold tracking-[0.2em]">生成 · 归档 · 公区</p>
        </div>
        
        <div className="flex gap-2">
          {/* Reference Image Button */}
          <button 
            id="tutorial-step-1"
            onClick={() => referenceInputRef.current?.click()}
            className={cn(
              "w-10 h-10 border flex items-center justify-center transition-all group relative",
              attributes.referenceImage 
                ? "bg-black text-white border-black" 
                : "border-black/5 hover:bg-black hover:text-white animate-flash-bw-btn hover:animate-none"
            )}
            title="参考图"
          >
            <ImagePlus size={16} />
            <div className="absolute top-full right-0 mt-2 bg-black text-white text-[8px] font-bold tracking-widest uppercase px-2 py-1 opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">
              参考图
            </div>
          </button>
          <input 
            type="file" 
            ref={referenceInputRef} 
            onChange={handleReferenceUpload} 
            className="hidden" 
            accept="image/*" 
          />

          {/* Reverse Prompt Button */}
          <button 
            onClick={() => interrogateInputRef.current?.click()}
            className="w-10 h-10 border border-black/5 flex items-center justify-center hover:bg-black hover:text-white transition-all group relative"
            title="关键词反推"
          >
            <Camera size={16} />
            <div className="absolute top-full right-0 mt-2 bg-black text-white text-[8px] font-bold tracking-widest uppercase px-2 py-1 opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">
              关键词反推
            </div>
          </button>
          <input 
            type="file" 
            ref={interrogateInputRef} 
            onChange={handleInterrogateUpload} 
            className="hidden" 
            accept="image/*" 
          />

          {/* 3D to Real Button */}
          <button 
            onClick={() => virtualInputRef.current?.click()}
            className={cn(
              "w-10 h-10 border flex items-center justify-center transition-all group relative",
              attributes.isVirtualRestoration ? "bg-black text-white border-black" : "border-black/5 hover:bg-black hover:text-white"
            )}
            title="3D 还原真人"
          >
            <Cpu size={16} />
            <div className="absolute top-full right-0 mt-2 bg-black text-white text-[8px] font-bold tracking-widest uppercase px-2 py-1 opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">
              3D 还原真人
            </div>
          </button>
          <input 
            type="file" 
            ref={virtualInputRef} 
            onChange={handleVirtualUpload} 
            className="hidden" 
            accept="image/*" 
          />
        </div>
      </div>

      {attributes.isVirtualRestoration && (
        <div className="mb-8 p-4 bg-black/5 border border-black/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black/10 rounded-sm overflow-hidden">
              <img src={attributes.virtualImage!} alt="Virtual" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col">
              <span className="text-black text-[9px] font-bold tracking-widest uppercase">Restoration Mode</span>
              <span className="text-black/40 text-[8px] uppercase">Active</span>
            </div>
          </div>
          <button 
            onClick={() => onChange({ ...attributes, isVirtualRestoration: false, virtualImage: null })}
            className="text-black/20 hover:text-black transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* 参考图 + 权重（紧凑单行布局，减少纵向占用） */}
      <div
        className="mb-3 rounded-sm border border-black/5 bg-black/5 p-2"
        id="tutorial-step-2"
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={cn(
              'relative h-9 w-9 shrink-0 overflow-hidden rounded-sm border border-black/10 transition-all',
              attributes.referenceImage
                ? 'bg-black/10'
                : 'cursor-pointer bg-black/5 hover:bg-black/10 animate-flash-bw-box hover:animate-none',
            )}
            onClick={() => !attributes.referenceImage && referenceInputRef.current?.click()}
            aria-label="上传参考图"
          >
            {attributes.referenceImage ? (
              <img src={attributes.referenceImage} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-black/35">
                <ImagePlus size={12} />
              </span>
            )}
          </button>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[7px] font-bold uppercase tracking-wider text-black">
                参考图权重
              </span>
              <span className="shrink-0 font-mono text-[7px] font-bold text-black/50">
                {Math.round(attributes.referenceWeight * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(attributes.referenceWeight * 100)}
              onChange={(e) => updateAttr('referenceWeight', parseInt(e.target.value, 10) / 100)}
              className="h-1 w-full cursor-pointer appearance-none rounded-full bg-black/10 accent-black"
            />
          </div>
          {attributes.referenceImage ? (
            <button
              type="button"
              onClick={() => onChange({ ...attributes, referenceImage: null })}
              className="shrink-0 text-black/25 transition-colors hover:text-black"
              aria-label="清除参考图"
            >
              <X size={12} />
            </button>
          ) : (
            <span className="w-3 shrink-0" />
          )}
        </div>
      </div>

      {attributes.interrogatedPrompt && (
        <div className="mb-6 p-3 bg-black/5 border border-black/5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-black text-[8px] font-bold tracking-widest uppercase">反推提示词 (Interrogated Prompt)</span>
            <button 
              onClick={() => onChange({ ...attributes, interrogatedPrompt: null })}
              className="text-black/20 hover:text-black transition-colors"
            >
              <X size={14} />
            </button>
          </div>
          <div className="bg-white p-2 border border-black/5 max-h-24 overflow-y-auto no-scrollbar">
            <p className="text-black/60 text-[8px] leading-relaxed select-all">
              {attributes.interrogatedPrompt}
            </p>
          </div>
          <button 
            onClick={() => {
              onChange({ 
                ...attributes, 
                customPrompt: attributes.interrogatedPrompt!,
                interrogatedPrompt: null 
              });
            }}
            className="w-full py-2 bg-black text-white text-[8px] font-bold tracking-widest uppercase hover:bg-black/90 transition-all"
          >
            Apply to Custom Prompt
          </button>
        </div>
      )}

      <div className="flex gap-8 mb-6 border-b border-black/5" id="tutorial-step-3">
        {(['male', 'female', 'creature'] as const).map((g) => (
          <button
            key={g}
            onClick={() => updateAttr('gender', g)}
            className={cn(
              "flex-1 py-2 text-[10px] font-bold tracking-widest uppercase transition-all",
              attributes.gender === g ? "bg-black text-white" : "text-black/40 hover:text-black"
            )}
          >
            {t(g)}
          </button>
        ))}
      </div>

      <div className="flex gap-8 mb-12 border-b border-black/5">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              "pb-4 text-[10px] font-bold tracking-widest uppercase transition-all relative",
              activeCategory === cat.id ? "text-black" : "text-black/20 hover:text-black"
            )}
          >
            {cat.label}
            {activeCategory === cat.id && (
              <motion.div layoutId="activeCat" className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar space-y-10">
        {attributes.isVirtualRestoration ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-12">
            <div className="w-12 h-12 border border-black/10 flex items-center justify-center">
              <div className="w-4 h-4 bg-black animate-pulse" />
            </div>
            <p className="text-black text-[10px] font-bold tracking-widest uppercase">{t('restoration_active')}</p>
            <p className="text-black/40 text-[10px] leading-relaxed">Other options are disabled in restoration mode</p>
          </div>
        ) : (
          <>
            {activeCategory === 'face' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <AttributeSlider 
                  label="年龄 (Age)" 
                  value={attributes.age} 
                  min={18} 
                  max={80} 
                  onChange={(v: number) => updateAttr('age', v)} 
                />
                <AttributeSelect 
                  label="人种 (Ethnicity)" 
                  value={attributes.ethnicity} 
                  options={['Caucasian', 'Asian', 'African', 'Hispanic', 'Middle Eastern']} 
                  onChange={(v: string) => updateAttr('ethnicity', v)} 
                />
                <AttributeSelect 
                  label="脸型 (Face Shape)" 
                  value={attributes.faceShape} 
                  options={[
                    'Oval',
                    'Melon-seed',
                    'Round',
                    'Square',
                    'Heart',
                    'Diamond',
                    'Long',
                    'High cheekbones',
                    'Strong jawline',
                  ]} 
                  onChange={(v: string) => updateAttr('faceShape', v)} 
                />
                <div className="grid grid-cols-2 gap-4">
                  <AttributeSelect 
                    label="鼻高 (Nose Height)" 
                    value={attributes.noseHeight} 
                    options={['High', 'Medium', 'Low']} 
                    onChange={(v: string) => updateAttr('noseHeight', v)} 
                  />
                  <AttributeSelect 
                    label="鼻宽 (Nose Width)" 
                    value={attributes.noseWidth} 
                    options={['Wide', 'Narrow', 'Average']} 
                    onChange={(v: string) => updateAttr('noseWidth', v)} 
                  />
                </div>
                <AttributeSelect 
                  label="眼型 (Eye Shape)" 
                  value={attributes.eyeShape} 
                  options={['Almond', 'Monolid', 'Hooded', 'Downturned', 'Upturned']} 
                  onChange={(v: string) => updateAttr('eyeShape', v)} 
                />
                <AttributeSelect 
                  label="嘴型 (Mouth Shape)" 
                  value={attributes.mouthShape} 
                  options={['Full', 'Thin', 'Bow-shaped']} 
                  onChange={(v: string) => updateAttr('mouthShape', v)} 
                />
                <AttributeSelect 
                  label="瞳色 (Eye Color)" 
                  value={attributes.eyeColor} 
                  options={['Blue', 'Brown', 'Green', 'Hazel', 'Grey', 'Piercing Green']} 
                  onChange={(v: string) => updateAttr('eyeColor', v)} 
                />
                <AttributeSelect 
                  label="表情 (Expression)" 
                  value={attributes.expression} 
                  options={['Neutral', 'Happy', 'Serious', 'Angry', 'Surprised', 'Smirk']} 
                  onChange={(v: string) => updateAttr('expression', v)} 
                />
              </div>
            )}

            {activeCategory === 'hair' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <VisualAttributeSelect 
                  label="发型 (Hair Style)" 
                  value={attributes.hairStyle} 
                  options={[
                    'Long wavy',
                    'Short crop',
                    'Buzz cut',
                    'Ponytail',
                    'Bald',
                    'Mohawk',
                    'Long straight',
                    'Custom',
                  ]} 
                  onChange={(v: string) => updateAttr('hairStyle', v)} 
                />
                {attributes.hairStyle === 'Custom' && (
                  <div className="space-y-2">
                    <span className="text-black/40 text-[10px] font-bold tracking-widest uppercase">
                      自定义发型描述
                    </span>
                    <textarea
                      value={attributes.hairStyleCustom}
                      onChange={(e) => updateAttr('hairStyleCustom', e.target.value)}
                      placeholder="例如：及肩层次剪、空气刘海、双麻花辫、银灰挑染短发…"
                      rows={3}
                      className="w-full resize-y rounded-sm border border-black/10 bg-white px-3 py-2 text-[11px] font-medium leading-relaxed text-black outline-none placeholder:text-black/25 focus:border-black/30"
                    />
                  </div>
                )}
                <AttributeSelect 
                  label="发色 (Hair Color)" 
                  value={attributes.hairColor} 
                  options={['Blonde', 'Black', 'Brown', 'Red', 'White', 'Blue', 'Dark brown']} 
                  onChange={(v: string) => updateAttr('hairColor', v)} 
                />
                <VisualAttributeSelect 
                  label="眉毛 (Eyebrows)" 
                  value={attributes.eyebrows} 
                  options={['Arched', 'Straight', 'Bushy', 'Thick', 'Thin']} 
                  onChange={(v: string) => updateAttr('eyebrows', v)} 
                />
                <VisualAttributeSelect 
                  label="胡须 (Beard)" 
                  value={attributes.beard} 
                  options={['Clean-shaven', 'Stubble', 'Full beard', 'Goatee', 'Mustache']} 
                  onChange={(v: string) => updateAttr('beard', v)} 
                />
              </div>
            )}

            {activeCategory === 'body' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <AttributeSlider 
                  label="身高 (Height)" 
                  value={attributes.height} 
                  min={150} 
                  max={200} 
                  onChange={(v: number) => updateAttr('height', v)} 
                />
                <div className="space-y-4">
                  <span className="text-black/40 text-[10px] font-bold tracking-widest uppercase">肤色 (Skin Tone)</span>
                  <div className="grid grid-cols-4 gap-2">
                    {['Fair', 'Light', 'Medium-Light', 'Medium', 'Medium-Dark', 'Dark', 'Deep', 'Ebony'].map((tone) => (
                      <button
                        key={tone}
                        onClick={() => updateAttr('skinTone', tone)}
                        className={cn(
                          "aspect-video rounded-sm border transition-all",
                          attributes.skinTone === tone ? "border-black ring-2 ring-inset ring-white z-10 relative" : "border-black/5 hover:border-black/20"
                        )}
                        style={{ backgroundColor: getSkinColor(tone) }}
                        title={t(tone)}
                      />
                    ))}
                  </div>
                </div>
                <AttributeSelect 
                  label="体型 (Body Type)" 
                  value={attributes.bodyType} 
                  options={['Athletic', 'Slim', 'Muscular', 'Average', 'Curvy']} 
                  onChange={(v: string) => updateAttr('bodyType', v)} 
                />
                <AttributeSelect 
                  label="服装 (Clothing)" 
                  value={attributes.clothing} 
                  options={['Minimalist techwear', 'Casual hoodie', 'Formal suit', 'Cyberpunk armor', 'T-shirt', 'Simple black tank top']} 
                  onChange={(v: string) => updateAttr('clothing', v)} 
                />
              </div>
            )}

            {activeCategory === 'scene' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <AttributeSelect 
                  label="妆容 (Makeup)" 
                  value={attributes.makeup} 
                  options={['No makeup', 'Natural beauty', 'Soft', 'Bold', 'Editorial']} 
                  onChange={(v: string) => updateAttr('makeup', v)} 
                />
                <AttributeSelect 
                  label="光照 (Lighting)" 
                  value={attributes.lighting} 
                  options={['Soft studio lighting', 'Cinematic Studio', 'Natural light', 'Dramatic', 'Neon']} 
                  onChange={(v: string) => updateAttr('lighting', v)} 
                />
                <AttributeSelect 
                  label="背景 (Background)" 
                  value={attributes.background} 
                  options={['Plain white wall', 'Futuristic studio', 'Urban', 'Nature', 'Solid Black']} 
                  onChange={(v: string) => updateAttr('background', v)} 
                />
              </div>
            )}
          </>
        )}
      </div>

      <div className="pt-6 mt-4 bg-white z-10">
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className={cn(
            "w-full py-5 rounded-sm text-[10px] font-bold tracking-[0.3em] uppercase transition-all duration-500",
            isGenerating 
              ? "bg-black/5 text-black/20 cursor-not-allowed" 
              : "bg-black text-white hover:bg-black/90 active:scale-[0.98] shadow-2xl"
          )}
        >
          {isGenerating ? "Processing..." : "Generate Model"}
        </button>
      </div>
    </div>
  );
}

function AttributeSlider({ label, value, min, max, onChange }: any) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-black/40 text-[10px] font-bold tracking-widest uppercase">{label}</span>
        <span className="text-black text-[10px] font-mono font-bold">{value}</span>
      </div>
      <input 
        type="range" 
        min={min} 
        max={max} 
        value={value} 
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-[2px] bg-black/5 rounded-full appearance-none cursor-pointer accent-black"
      />
    </div>
  );
}

function AttributeSelect({ label, value, options, onChange }: any) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="space-y-3 relative">
      <span className="text-black/40 text-[10px] font-bold tracking-widest uppercase">{label}</span>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full border-b border-black/10 py-2 flex items-center justify-between text-black text-xs font-bold hover:border-black transition-colors"
      >
        {t(value)}
        {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-black/5 rounded-sm overflow-hidden z-50 shadow-2xl max-h-48 overflow-y-auto no-scrollbar">
          {options.map((opt: string) => (
            <button
              key={opt}
              onClick={() => {
                onChange(opt);
                setIsOpen(false);
              }}
              className={cn(
                "w-full px-4 py-3 text-left text-[10px] font-bold tracking-widest uppercase transition-colors",
                value === opt ? "bg-black text-white" : "text-black/40 hover:text-black hover:bg-black/5"
              )}
            >
              {t(opt)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function VisualAttributeSelect({ label, value, options, onChange }: any) {
  return (
    <div className="space-y-4">
      <span className="text-black/40 text-[10px] font-bold tracking-widest uppercase">{label}</span>
      <div className="grid grid-cols-2 gap-2">
        {options.map((opt: string) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={cn(
              "flex items-center justify-center px-4 py-3 rounded-sm border text-[9px] font-bold tracking-widest uppercase transition-all duration-300",
              value === opt 
                ? "bg-black border-black text-white shadow-xl" 
                : "bg-transparent border-black/5 text-black/40 hover:border-black/20"
            )}
          >
            {t(opt)}
          </button>
        ))}
      </div>
    </div>
  );
}
