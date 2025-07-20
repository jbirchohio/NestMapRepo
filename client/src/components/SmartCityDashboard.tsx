import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MapPin, 
  Wifi, 
  Car, 
  Bus, 
  Zap, 
  Thermometer,
  Wind,
  Droplets,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface IoTDevice {
  id: string;
  name: string;
  type: 'sensor' | 'camera' | 'beacon' | 'display';
  location: { lat: number; lng: number; address: string };
  status: 'online' | 'offline' | 'maintenance';
  lastUpdate: string;
  data: Record<string, any>;
}

interface SmartCityService {
  id: string;
  name: string;
  category: 'transport' | 'environment' | 'safety' | 'energy';
  status: 'active' | 'inactive' | 'degraded';
  metrics: Record<string, number>;
  alerts: Array<{ level: 'info' | 'warning' | 'error'; message: string; timestamp: string }>;
}

export default function SmartCityDashboard() {
  const [selectedCity, setSelectedCity] = useState('london');
  const [selectedTab, setSelectedTab] = useState('overview');

  const { data: cityData, isLoading } = useQuery({
    queryKey: ['/api/smart-city/dashboard', selectedCity],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/smart-city/dashboard/${selectedCity}`);
      return response.data;
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const { data: iotDevices } = useQuery({
    queryKey: ['/api/smart-city/iot-devices', selectedCity],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/smart-city/iot-devices/${selectedCity}`);
      return response.data;
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading smart city data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Smart City Integration</h2>
          <p className="text-muted-foreground">
            Real-time IoT data and smart city services for enhanced travel planning
          </p>
        </div>
        <select
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)}
          className="px-3 py-2 border rounded-md"
        >
          <option value="london">London</option>
          <option value="paris">Paris</option>
          <option value="tokyo">Tokyo</option>
          <option value="newyork">New York</option>
        </select>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transport">Transport</TabsTrigger>
          <TabsTrigger value="environment">Environment</TabsTrigger>
          <TabsTrigger value="iot">IoT Devices</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active IoT Devices</CardTitle>
                <Wifi className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{cityData?.iotDevices?.active || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {cityData?.iotDevices?.total || 0} total devices
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Air Quality Index</CardTitle>
                <Wind className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{cityData?.environment?.aqi || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {cityData?.environment?.aqiLevel || 'Good'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Traffic Flow</CardTitle>
                <Car className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{cityData?.transport?.trafficFlow || 0}%</div>
                <p className="text-xs text-muted-foreground">
                  {cityData?.transport?.congestionLevel || 'Moderate'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Energy Usage</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{cityData?.energy?.usage || 0}MW</div>
                <p className="text-xs text-muted-foreground">
                  {cityData?.energy?.efficiency || 0}% efficiency
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Smart City Services Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {cityData?.services?.map((service: SmartCityService) => (
                    <div key={service.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          service.status === 'active' ? 'bg-green-500' :
                          service.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}></div>
                        <div>
                          <p className="font-medium">{service.name}</p>
                          <p className="text-sm text-muted-foreground">{service.category}</p>
                        </div>
                      </div>
                      <Badge variant={service.status === 'active' ? 'default' : 'secondary'}>
                        {service.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Environmental Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={cityData?.environmentalTrends || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="aqi" stroke="#8884d8" strokeWidth={2} />
                    <Line type="monotone" dataKey="temperature" stroke="#82ca9d" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="transport" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bus className="h-5 w-5" />
                  Public Transport
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Bus Network</span>
                    <Badge variant="outline">98% operational</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Metro System</span>
                    <Badge variant="outline">100% operational</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Delay</span>
                    <span className="text-sm">2.3 minutes</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  Traffic Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Congestion Level</span>
                      <span className="text-sm">{cityData?.transport?.congestionLevel}</span>
                    </div>
                    <Progress value={cityData?.transport?.trafficFlow || 0} />
                  </div>
                  <div className="flex justify-between">
                    <span>Smart Signals</span>
                    <Badge variant="outline">1,247 active</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Parking
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Availability</span>
                      <span className="text-sm">{cityData?.parking?.availability}%</span>
                    </div>
                    <Progress value={cityData?.parking?.availability || 0} />
                  </div>
                  <div className="flex justify-between">
                    <span>Smart Meters</span>
                    <Badge variant="outline">5,432 online</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="environment" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Temperature</CardTitle>
                <Thermometer className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{cityData?.environment?.temperature}°C</div>
                <p className="text-xs text-muted-foreground">
                  Feels like {cityData?.environment?.feelsLike}°C
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Humidity</CardTitle>
                <Droplets className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{cityData?.environment?.humidity}%</div>
                <p className="text-xs text-muted-foreground">
                  Dew point {cityData?.environment?.dewPoint}°C
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Wind Speed</CardTitle>
                <Wind className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{cityData?.environment?.windSpeed} km/h</div>
                <p className="text-xs text-muted-foreground">
                  {cityData?.environment?.windDirection}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">UV Index</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{cityData?.environment?.uvIndex}</div>
                <p className="text-xs text-muted-foreground">
                  {cityData?.environment?.uvLevel}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="iot" className="space-y-4">
          <div className="grid gap-4">
            {iotDevices?.map((device: IoTDevice) => (
              <Card key={device.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{device.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{device.location.address}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {device.status === 'online' ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : device.status === 'maintenance' ? (
                        <Clock className="h-5 w-5 text-yellow-500" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                      )}
                      <Badge variant={device.status === 'online' ? 'default' : 'secondary'}>
                        {device.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm font-medium">Device Type</p>
                      <p className="text-sm text-muted-foreground capitalize">{device.type}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Last Update</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(device.lastUpdate).toLocaleTimeString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Location</p>
                      <p className="text-sm text-muted-foreground">
                        {device.location.lat.toFixed(4)}, {device.location.lng.toFixed(4)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Data Points</p>
                      <p className="text-sm text-muted-foreground">
                        {Object.keys(device.data).length} metrics
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
