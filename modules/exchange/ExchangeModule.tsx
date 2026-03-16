import React from 'react';

type Tab = 'listed' | 'sold';
type Scope = 'all' | 'mine' | 'participated';

export default function ExchangeModule() {
  const [tab, setTab] = React.useState<Tab>('listed');
  const [scope, setScope] = React.useState<Scope>('all');

  // TODO: replace with real API /api/exchange/items
  const mockItems = [
    {
      id: 'item-1',
      seller: 'WeChat User',
      avatar:
        'https://lh3.googleusercontent.com/a-/AFdZucqvGx-avatar=s64',
      title: 'UR赏 异极工作室',
      serialNumber: 'No.198000011',
      price: 2120,
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCiEQCORVh-kLhp7NqmkpZ5HoOtxiVu4RhVvexm7jzjha_PPv68KVc_6CZjD5j4H9-IQBYqUWhiHWDqHgrEnNRDWagTRNXhjjt2pJ-sylQoTie7ASgZ_6m-VA3P0TG0s6MNwdHoLK33prSYM7Sdzmip7OBqpOxXu2MPOhsCe92UTT7dtqqS5LU2_KYbScFHF2hgeCVnhUJtKKywrRluBFqJi8_VRUUKkJl7kcyV658iG4d8u6IqCvNYX-zczx4bRuWS-4JRUgxsC4Xt',
    },
  ];

  return (
    <div className="min-h-screen bg-background-dark text-white flex flex-col font-future">
      {/* Header with tabs */}
      <header className="px-6 pt-12 pb-4 bg-background-dark/80 backdrop-blur-md sticky top-0 z-40 flex justify-between items-center">
        <div className="flex gap-4">
          <button
            className={`text-xl font-black tracking-tighter ${
              tab === 'listed' ? 'uppercase' : 'uppercase text-white/40'
            }`}
            onClick={() => setTab('listed')}
          >
            发布中
          </button>
          <button
            className={`text-xl font-black tracking-tighter ${
              tab === 'sold' ? 'uppercase' : 'uppercase text-white/40'
            }`}
            onClick={() => setTab('sold')}
          >
            成交墙
          </button>
        </div>
        <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
          <span className="material-icons-round text-lg">filter_alt</span>
        </button>
      </header>

      {/* Scope / order bar */}
      <div className="px-6 pb-2 pt-1 flex justify-between items-center text-[11px] uppercase tracking-[0.2em] text-white/40">
        <div className="flex gap-3">
          {[
            { key: 'all', label: '全部' },
            { key: 'mine', label: '我发布的' },
            { key: 'participated', label: '我参与的' },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => setScope(opt.key as Scope)}
              className={`px-2 py-1 rounded-full border text-[10px] font-bold ${
                scope === opt.key
                  ? 'border-primary text-primary bg-primary/10'
                  : 'border-transparent text-white/40'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <span>排序</span>
          <span className="material-icons-round text-xs">arrow_drop_down</span>
        </div>
      </div>

      {/* List */}
      <main className="flex-1 px-6 pb-28 space-y-4 overflow-y-auto">
        {mockItems.map((item) => (
          <div
            key={item.id}
            className="glass rounded-[2.2rem] border border-white/10 overflow-hidden"
          >
            <div className="px-4 pt-3 flex justify-between items-center text-[11px] text-white/50">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-white/10 overflow-hidden">
                  <img
                    src={item.avatar}
                    alt={item.seller}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <span className="font-bold truncate max-w-[120px]">
                  {item.seller}
                </span>
              </div>
              <span className="text-[10px]">共 1 件</span>
            </div>

            <div className="px-4 pt-2 pb-4 flex gap-3 items-center">
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="text-[11px] text-white/50">
                    {item.serialNumber}
                  </div>
                  <div className="text-sm font-bold line-clamp-1 mt-1">
                    {item.title}
                  </div>
                </div>
                <div className="mt-2 flex justify-between items-center">
                  <button className="px-3 py-1.5 rounded-full bg-primary/10 border border-primary/40 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                    赏币买入
                  </button>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[11px] text-white/60">一口价</span>
                    <span className="text-lg font-display font-black text-primary">
                      ¥{item.price}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {mockItems.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-white/40">
            <span className="material-icons-round text-4xl mb-2">inventory_2</span>
            <p className="text-sm font-bold uppercase tracking-widest">
              暂无发布中的交换
            </p>
          </div>
        )}
      </main>

      {/* Publish button */}
      <button
        className="fixed bottom-24 left-1/2 -translate-x-1/2 w-32 h-10 bg-primary text-black rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(212,255,0,0.3)] z-50 text-[11px] font-black uppercase tracking-[0.2em]"
        type="button"
      >
        发布交换
      </button>
    </div>
  );
}

