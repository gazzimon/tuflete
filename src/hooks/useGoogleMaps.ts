import { useState, useCallback } from 'react';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteInfo {
  distanceText?: string;
  durationText?: string;
}

export const useGoogleMaps = () => {
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo>({});
  const [isCalculating, setIsCalculating] = useState(false);

  const calculateRoute = useCallback(async (origin: LatLng, destination: LatLng) => {
    if (!origin || !destination) return;

    setIsCalculating(true);
    const service = new google.maps.DirectionsService();
    
    try {
      const result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
        service.route(
          { 
            origin, 
            destination, 
            travelMode: google.maps.TravelMode.DRIVING,
            avoidHighways: false,
            avoidTolls: false
          },
          (result, status) => {
            if (status === 'OK' && result) {
              resolve(result);
            } else {
              reject(new Error(`Directions request failed: ${status}`));
            }
          }
        );
      });

      setDirections(result);
      const leg = result.routes?.[0]?.legs?.[0];
      setRouteInfo({
        distanceText: leg?.distance?.text,
        durationText: leg?.duration?.text,
      });
    } catch (error) {
      console.warn('Error calculating route:', error);
      setDirections(null);
      setRouteInfo({});
    } finally {
      setIsCalculating(false);
    }
  }, []);

  const clearRoute = useCallback(() => {
    setDirections(null);
    setRouteInfo({});
    setIsCalculating(false);
  }, []);

  return {
    directions,
    routeInfo,
    isCalculating,
    calculateRoute,
    clearRoute
  };
};
