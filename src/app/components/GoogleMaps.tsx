"use client";
import { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";

export default function GoogleMaps() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [showInputs, setShowInputs] = useState(false); // Affichage des champs d'adresse
  const [showRouteButton, setShowRouteButton] = useState(false); // Affichage du bouton "Afficher l'itinéraire"
  const [addressStart, setAddressStart] = useState("");
  const [addressDestination, setAddressDestination] = useState("");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  let map: google.maps.Map | null = null;
  let markerStart: google.maps.Marker | null = null;
  let markerDestination: google.maps.Marker | null = null;
  let directionsService: google.maps.DirectionsService | null = null;
  let directionsRenderer: google.maps.DirectionsRenderer | null = null;

  const initializeMap = async (lat: number, lng: number) => {
    try {
      const loader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
        version: "quarterly",
      });

      const { Map } = await loader.importLibrary("maps");
      const { Marker } = await loader.importLibrary("marker");
      const { DirectionsService, DirectionsRenderer } = await loader.importLibrary("routes");

      if (mapRef.current) {
        map = new Map(mapRef.current, {
          center: { lat, lng },
          zoom: 14,
        });

        markerStart = new Marker({
          position: { lat, lng },
          map: map,
          title: "Votre position",
        });

        directionsService = new DirectionsService();
        directionsRenderer = new DirectionsRenderer();
        directionsRenderer.setMap(map);
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
          initializeMap(45.764043, 4.835659);
        }
      );
    } else {
      initializeMap(45.764043, 4.835659);
    }

    return () => {
      if (map) map = null;
      if (markerStart) markerStart = null;
      if (markerDestination) markerDestination = null;
    };
  }, []);

  const handleSearch = async (address: string, isStart: boolean) => {
    if (!address) return;

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          address
        )}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();

      if (data.status === "OK") {
        const { lat, lng } = data.results[0].geometry.location;

        if (map) {
          map.setCenter({ lat, lng });

          if (isStart) {
            if (markerStart) markerStart.setPosition({ lat, lng });
            else markerStart = new google.maps.Marker({ position: { lat, lng }, map, title: "Départ" });
            setAddressStart(address);
          } else {
            if (markerDestination) markerDestination.setPosition({ lat, lng });
            else markerDestination = new google.maps.Marker({ position: { lat, lng }, map, title: "Destination" });
            setAddressDestination(address);
          }

          // Vérifie si les deux adresses sont présentes pour afficher le bouton "Afficher l'itinéraire"
          if (addressStart && addressDestination) {
            setShowRouteButton(true);
          }
        }
      } else {
        alert("Adresse introuvable !");
      }
    } catch (error) {
      console.error("Erreur lors de la recherche d'adresse :", error);
    }
  };

  const setMyLocation = (isStart: boolean) => {
    if (userLocation) {
      const { lat, lng } = userLocation;
      if (isStart) {
        setAddressStart("Ma position");
        handleSearch(`${lat},${lng}`, true);
      } else {
        setAddressDestination("Ma position");
        handleSearch(`${lat},${lng}`, false);
      }
    } else {
      alert("Localisation non disponible !");
    }
  };

  const calculateRoute = async () => {
    if (!addressStart || !addressDestination || !directionsService || !directionsRenderer) return;

    const request = {
      origin: addressStart === "Ma position" ? userLocation : addressStart,
      destination: addressDestination === "Ma position" ? userLocation : addressDestination,
      travelMode: google.maps.TravelMode.DRIVING,
    };

    directionsService.route(request, (result, status) => {
      if (status === "OK") {
        directionsRenderer.setDirections(result);
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
          {/* Adresse de départ */}
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
            <button onClick={() => setMyLocation(true)} className="bg-green-500 text-white p-2 rounded-lg">
              Ma Position
            </button>
          </div>

          {/* Adresse de destination */}
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
            <button onClick={() => setMyLocation(false)} className="bg-green-500 text-white p-2 rounded-lg">
              Ma Position
            </button>
          </div>

          {/* Bouton Afficher l'itinéraire */}
          {showRouteButton && (
            <button onClick={calculateRoute} className="bg-red-500 text-white p-3 m-4 rounded-lg w-full">
              Afficher l'itinéraire
            </button>
          )}
        </div>
      )}

      <div className="h-[700px] w-full" ref={mapRef}></div>
    </div>
  );
}
