"use client";
import { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";

export default function GoogleMaps() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markerStartRef = useRef<google.maps.Marker | null>(null);
  const markerDestinationRef = useRef<google.maps.Marker | null>(null);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);

  const [showInputs, setShowInputs] = useState(false);
  const [showRouteButton, setShowRouteButton] = useState(false);
  const [addressStart, setAddressStart] = useState("");
  const [addressDestination, setAddressDestination] = useState("");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const initializeMap = async (lat: number, lng: number) => {
    try {
      const loader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
        version: "weekly",
      });

      await loader.load();

      if (mapRef.current) {
        const map = new google.maps.Map(mapRef.current, {
          center: { lat, lng },
          zoom: 14,
        });

        mapInstance.current = map;
        markerStartRef.current = new google.maps.Marker({
          position: { lat, lng },
          map,
          title: "Votre position",
        });

        directionsServiceRef.current = new google.maps.DirectionsService();
        directionsRendererRef.current = new google.maps.DirectionsRenderer();
        directionsRendererRef.current.setMap(map);
      }
    } catch (error) {
      console.error("Erreur lors de l‘initialisation de la carte :", error);
    }
  };

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          initializeMap(latitude, longitude);
        },
        () => {
          initializeMap(45.764043, 4.835659); // Lyon par défaut
        }
      );
    } else {
      initializeMap(45.764043, 4.835659);
    }
  }, []);

  const handleSearch = async (address: string, isStart: boolean) => {
    if (!address || !mapInstance.current) return;

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          address
        )}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();

      if (data.status === "OK") {
        const { lat, lng } = data.results[0].geometry.location;

        mapInstance.current.setCenter({ lat, lng });

        if (isStart) {
          if (markerStartRef.current) markerStartRef.current.setPosition({ lat, lng });
          else markerStartRef.current = new google.maps.Marker({ position: { lat, lng }, map: mapInstance.current, title: "Départ" });
          setAddressStart(address);
        } else {
          if (markerDestinationRef.current) markerDestinationRef.current.setPosition({ lat, lng });
          else markerDestinationRef.current = new google.maps.Marker({ position: { lat, lng }, map: mapInstance.current, title: "Destination" });
          setAddressDestination(address);
        }

        // Vérifie si les deux adresses sont présentes pour afficher le bouton "Afficher l'itinéraire"
        if (addressStart && addressDestination) {
          setShowRouteButton(true);
        }
      } else {
        alert("Adresse introuvable !");
      }
    } catch (error) {
      console.error("Erreur lors de la recherche d'adresse :", error);
    }
  };

  const calculateRoute = async () => {
    if (!addressStart || !addressDestination || !directionsServiceRef.current || !directionsRendererRef.current) return;

    const request = {
      origin: addressStart === "Ma position" ? userLocation : addressStart,
      destination: addressDestination === "Ma position" ? userLocation : addressDestination,
      travelMode: google.maps.TravelMode.DRIVING,
    };

    directionsServiceRef.current.route(request, (result, status) => {
      if (status === "OK") {
        directionsRendererRef.current?.setDirections(result);
      } else {
        console.error("Erreur lors du calcul de l'itinéraire :", status);
      }
    });
  };

  return (
    <div>
      <button
        onClick={() => setShowInputs(!showInputs)}
        className="bg-gray-700 text-white p-3 m-4 rounded-lg"
      >
        {showInputs ? "Masquer" : "Afficher"} les champs d'adresse
      </button>

      {showInputs && (
        <div>
          <div className="flex gap-2 p-4">
            <input
              type="text"
              value={addressStart}
              onChange={(e) => setAddressStart(e.target.value)}
              placeholder="Entrez l'adresse de départ..."
              className="border border-gray-300 p-2 w-full rounded-lg"
            />
            <button onClick={() => handleSearch(addressStart, true)} className="bg-blue-500 text-white p-2 rounded-lg">
              Rechercher
            </button>
          </div>

          <div className="flex gap-2 p-4">
            <input
              type="text"
              value={addressDestination}
              onChange={(e) => setAddressDestination(e.target.value)}
              placeholder="Entrez l'adresse de destination..."
              className="border border-gray-300 p-2 w-full rounded-lg"
            />
            <button onClick={() => handleSearch(addressDestination, false)} className="bg-blue-500 text-white p-2 rounded-lg">
              Rechercher
            </button>
          </div>

          {showRouteButton && (
            <button onClick={calculateRoute} className="bg-green-400 text-white p-3 m-4 rounded-lg w-full">
              Afficher l'itinéraire
            </button>
          )}
        </div>
      )}

      <div className="h-[700px] w-full" ref={mapRef}></div>
    </div>
  );
}
