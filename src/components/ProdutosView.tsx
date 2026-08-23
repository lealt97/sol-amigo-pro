import React, { useState } from 'react';
import { Package, Plus, Search, Shield, Zap, Sun, Box } from 'lucide-react';
import { SolarProduct, ThemeConfig } from '../types';

interface ProdutosViewProps {
  products: SolarProduct[];
  theme: ThemeConfig;
  onAddProduct: (prod: SolarProduct) => void;
  onShowToast: (msg: string) => void;
}

export const ProdutosView: React.FC<ProdutosViewProps> = ({
  products,
  theme,
  onAddProduct,
  onShowToast,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('all');

  const filtered = products.filter((p) => {
    const matchCat = selectedCat === 'all' || p.category === selectedCat;
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase()) ||
      p.model.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div id="produtos-page" className="space-y-6 max-w-7xl mx-auto">
      {/* Banner */}
      <section className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider mb-2">
            <Package className="w-3.5 h-3.5" />
            Engenharia / Estoque de Equipamentos
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Catálogo de Equipamentos Fotovoltaicos
          </h2>
          <p className="text-slate-500 text-sm mt-1 max-w-2xl">
            Módulos fotovoltaicos Tier-1, inversores string, microinversores, baterias e estruturas de fixação com preços e garantias de fábrica.
          </p>
        </div>
      </section>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar módulo, inversor, marca..."
            className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 text-slate-800"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {['all', 'Módulo FV', 'Inversor', 'Microinversor', 'Estrutura'].map(
            (cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                  selectedCat === cat
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {cat === 'all' ? 'Todos' : cat}
              </button>
            )
          )}
        </div>
      </div>

      {/* Product Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((prod) => (
          <div
            key={prod.id}
            className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                  {prod.category === 'Módulo FV' && <Sun className="w-3 h-3 text-amber-600" />}
                  {prod.category === 'Inversor' && <Zap className="w-3 h-3 text-blue-600" />}
                  {prod.category}
                </span>
                <span className="text-[11px] font-mono text-slate-400 font-bold">
                  {prod.brand}
                </span>
              </div>

              <h3 className="font-extrabold text-slate-900 text-base mt-2">
                {prod.name}
              </h3>
              <span className="text-xs font-mono text-slate-500 block">
                Modelo: {prod.model}
              </span>

              <div className="grid grid-cols-2 gap-2 mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                {prod.powerW && (
                  <div>
                    <span className="text-[10px] text-slate-400 block">Potência</span>
                    <span className="font-black text-slate-800">
                      {prod.powerW >= 1000 ? `${prod.powerW / 1000} kW` : `${prod.powerW} W`}
                    </span>
                  </div>
                )}
                {prod.efficiency && (
                  <div>
                    <span className="text-[10px] text-slate-400 block">Eficiência</span>
                    <span className="font-black text-emerald-600">
                      {prod.efficiency}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-[10px] text-slate-400 block">Garantia</span>
                  <span className="font-bold text-slate-700">
                    {prod.warrantyYears} anos
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Estoque</span>
                  <span className="font-bold text-blue-600">
                    {prod.inStock} unidades
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block">Preço Unitário</span>
                <span className="text-base font-black text-slate-900">
                  R$ {prod.unitPrice.toLocaleString('pt-BR')}
                </span>
              </div>
              <button
                onClick={() => onShowToast(`Item ${prod.name} adicionado ao kit!`)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Usar na Proposta
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
