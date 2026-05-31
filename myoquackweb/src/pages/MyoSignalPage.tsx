import { Card } from '../components/common/Card'
import { useHardware } from '../context/HardwareContext'
import { LineChart, Line, YAxis, ResponsiveContainer, CartesianGrid, XAxis } from 'recharts'

export function MyoSignalPage() {
  // Now we pull in emgHistory as well
  const { isConnected, emgValue, emgHistory } = useHardware()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-primary dark:text-blue-400">
            Hardware MyoSignal
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Gestión de conexión ESP32 y visualización de señal cruda.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Panel 1: Connection Status */}
        <Card title="Estado de Conexión">
          <div className="flex flex-col items-center justify-center space-y-4 py-8">
            <div 
              className={`flex h-24 w-24 items-center justify-center rounded-full transition-colors ${
                isConnected ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-slate-100 dark:bg-slate-800'
              }`}
            >
              <span className="text-4xl">{isConnected ? '🟢' : '🔌'}</span>
            </div>
            <p className={`text-sm font-semibold ${isConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
              {isConnected ? 'ESP32 Conectado y transmitiendo' : 'Esperando conexión...'}
            </p>
            
            {/* Small readout of the exact value when connected */}
            {isConnected && (
              <p className="font-mono text-xl font-bold text-emerald-500">
                {emgValue.toFixed(2)} uV
              </p>
            )}
          </div>
        </Card>

        {/* Panel 2: Signal Plot */}
        <Card title="Monitor de Señal en Vivo">
          <div className="flex h-64 w-full flex-col items-center justify-center overflow-hidden rounded-lg bg-slate-900 p-4 shadow-inner">
             {isConnected ? (
               <div className="h-full w-full">
                 <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={emgHistory} margin={{ top: 10, right: 10, left: 0, bottom: 15 }} >
                     <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <YAxis 
                        domain={[-1700, 1700]} 
                        ticks={[-1700, -850, 0, 850, 1700]} // Forces these exact intervals
                        width={85} // Gives the labels enough room so they don't get clipped!
                        allowDataOverflow={true} 
                        tickFormatter={(value) => `${value} mV`}
                        tick={{ fill: '#94A3B8', fontSize: 13, fontFamily: 'monospace' }} // Matches your retro/tech theme
                        axisLine={{ stroke: '#334155', strokeWidth: 2 }} // Slightly thicker axis line
                        tickLine={{ stroke: '#334155' }}
                        tickMargin={5} // Pushes the text a tiny bit away from the line
                      />
                     <XAxis dataKey="time" hide />
                     <Line 
                       type="monotone" 
                       dataKey="value" 
                       stroke="#10b981" /* Emerald 500 */
                       strokeWidth={3}
                       dot={false} /* Removes dots for a clean continuous line */
                       isAnimationActive={false} /* Disabling animation prevents lag in real-time plotting */
                     />
                   </LineChart>
                 </ResponsiveContainer>
               </div>
             ) : (
               <p className="font-mono text-sm text-slate-500">
                 -- Sin datos entrantes --
               </p>
             )}
          </div>
        </Card>
      </div>
    </div>
  )
}