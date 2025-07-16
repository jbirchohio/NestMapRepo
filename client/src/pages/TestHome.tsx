import { Plane, User, Settings } from 'lucide-react';

export default function TestHome() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-blue-500 mb-6">Styling Test Page</h1>
      
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Basic Tailwind Colors</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-red-500 text-white rounded-lg">Red-500</div>
          <div className="p-4 bg-blue-500 text-white rounded-lg">Blue-500</div>
          <div className="p-4 bg-green-500 text-white rounded-lg">Green-500</div>
          <div className="p-4 bg-yellow-500 text-white rounded-lg">Yellow-500</div>
        </div>
      </section>
      
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Custom Electric Theme</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          <div className="p-4 bg-electric-100 text-electric-900 rounded-lg">Electric-100</div>
          <div className="p-4 bg-electric-300 text-white rounded-lg">Electric-300</div>
          <div className="p-4 bg-electric-500 text-white rounded-lg">Electric-500</div>
          <div className="p-4 bg-electric-700 text-white rounded-lg">Electric-700</div>
          <div className="p-4 bg-electric-900 text-white rounded-lg">Electric-900</div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Icon Tests</h2>
        <div className="flex space-x-6 mb-4">
          <div className="flex flex-col items-center">
            <div className="h-12 w-12 bg-electric-500 rounded-lg flex items-center justify-center">
              <Plane className="h-6 w-6 text-white" />
            </div>
            <span className="mt-2 text-sm">Plane Icon</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="h-12 w-12 bg-blue-500 rounded-lg flex items-center justify-center">
              <User className="h-6 w-6 text-white" />
            </div>
            <span className="mt-2 text-sm">User Icon</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="h-12 w-12 bg-green-500 rounded-lg flex items-center justify-center">
              <Settings className="h-6 w-6 text-white" />
            </div>
            <span className="mt-2 text-sm">Settings Icon</span>
          </div>
        </div>
      </section>
      
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Gradients Test</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-24 bg-gradient-to-r from-electric-400 to-electric-600 rounded-lg flex items-center justify-center text-white">
            Electric Gradient (Horizontal)
          </div>
          <div className="h-24 bg-gradient-to-br from-electric-300 via-electric-500 to-electric-700 rounded-lg flex items-center justify-center text-white">
            Electric Gradient (Diagonal)
          </div>
        </div>
      </section>
      
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">CSS Variables Test</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-[color:var(--primary)] text-white rounded-lg">
            Primary Color from CSS Variable
          </div>
          <div className="p-4 bg-[color:var(--secondary)] text-[color:var(--secondary-foreground)] rounded-lg">
            Secondary Color from CSS Variable
          </div>
        </div>
      </section>
    </div>
  );
}
