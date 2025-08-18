import { useState, useCallback } from 'react';

export interface ValidationError {
  field: string;
  message: string;
}

export interface FormData {
  origen: string;
  destino: string;
  origenLL: { lat: number; lng: number } | null;
  destinoLL: { lat: number; lng: number } | null;
  vehiculo: string;
  fecha: Date | null;
}

export const useFormValidation = () => {
  const [errors, setErrors] = useState<ValidationError[]>([]);

  const validateForm = useCallback((data: FormData): boolean => {
    const newErrors: ValidationError[] = [];

    if (!data.origen.trim()) {
      newErrors.push({ field: 'origen', message: 'El origen es requerido' });
    }

    if (!data.destino.trim()) {
      newErrors.push({ field: 'destino', message: 'El destino es requerido' });
    }

    if (!data.origenLL) {
      newErrors.push({ field: 'origen', message: 'Seleccioná una dirección válida de origen' });
    }

    if (!data.destinoLL) {
      newErrors.push({ field: 'destino', message: 'Seleccioná una dirección válida de destino' });
    }

    if (data.origenLL && data.destinoLL) {
      const distance = calculateDistance(data.origenLL, data.destinoLL);
      if (distance < 0.1) {
        newErrors.push({ field: 'general', message: 'El origen y destino son muy cercanos' });
      }
      if (distance > 1000) {
        newErrors.push({ field: 'general', message: 'La distancia es demasiado larga para nuestro servicio' });
      }
    }

    if (data.fecha && data.fecha < new Date()) {
      newErrors.push({ field: 'fecha', message: 'La fecha no puede ser en el pasado' });
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const getFieldError = useCallback((field: string) => {
    return errors.find(error => error.field === field)?.message;
  }, [errors]);

  return {
    errors,
    validateForm,
    clearErrors,
    getFieldError,
    hasErrors: errors.length > 0
  };
};

// Función auxiliar para calcular distancia
function calculateDistance(point1: { lat: number; lng: number }, point2: { lat: number; lng: number }): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (point2.lat - point1.lat) * Math.PI / 180;
  const dLon = (point2.lng - point1.lng) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
