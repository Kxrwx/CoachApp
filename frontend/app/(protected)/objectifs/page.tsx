import { Target, CheckCircle2, Clock, Plus } from "lucide-react";

const OBJECTIFS_MOCK = [
  { id: 1, title: "Finir le MVP", status: "In Progress", deadLine: "12 Mars", progress: 65 },
  { id: 2, title: "Optimiser le Layout", status: "Done", deadLine: "Hier", progress: 100 },
  { id: 3, title: "Rédaction Documentation", status: "To Do", deadLine: "20 Mars", progress: 10 },
];

export default function ObjectifsPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header de la page */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Mes Objectifs</h2>
          <p className="text-gray-500 text-sm">Suivez vos avancées en temps réel.</p>
        </div>
        <button className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
          <Plus size={18} />
          <span>Nouvel Objectif</span>
        </button>
      </div>

      {/* Grille d'objectifs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {OBJECTIFS_MOCK.map((obj) => (
          <div key={obj.id} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2 rounded-lg ${obj.progress === 100 ? 'bg-green-100' : 'bg-blue-100'}`}>
                <Target className={obj.progress === 100 ? 'text-green-600' : 'text-blue-600'} size={20} />
              </div>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                obj.progress === 100 ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'
              }`}>
                {obj.status}
              </span>
            </div>
            
            <h3 className="font-semibold text-gray-800 mb-1">{obj.title}</h3>
            
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-4">
              <Clock size={14} />
              <span>Deadline : {obj.deadLine}</span>
            </div>

            {/* Barre de progression */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span>Progression</span>
                <span>{obj.progress}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div 
                  className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500" 
                  style={{ width: `${obj.progress}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="h-40 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-gray-400">
        Zone de contenu supplémentaire pour tester le défilement...
      </div>
    </div>
  );
}