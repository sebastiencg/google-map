"use client";
import { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { FaBicycle, FaCar, FaWalking } from "react-icons/fa";
import { io } from "socket.io-client";

export default function GoogleMaps() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const userMarkers = useRef<{ [id: string]: google.maps.Marker }>({});
  const markerStartRef = useRef<google.maps.Marker | null>(null);
  const markerDestinationRef = useRef<google.maps.Marker | null>(null);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const currentUserId = useRef<string | null>(null);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showInputs, setShowInputs] = useState(false);
  const [showRouteButton, setShowRouteButton] = useState(false);
  const [addressStart, setAddressStart] = useState("");
  const [addressDestination, setAddressDestination] = useState("");
  const [travelMode, setTravelMode] = useState<string>("DRIVING");

  const initializeMap = async (lat: number, lng: number) => {
    try {
      const loader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
        version: "weekly",
      });

      await loader.load();

      if (mapRef.current && window.google) {
        const map = new window.google.maps.Map(mapRef.current, {
          center: { lat, lng },
          zoom: 14,
        });

        mapInstance.current = map;

        directionsServiceRef.current = new window.google.maps.DirectionsService();
        directionsRendererRef.current = new window.google.maps.DirectionsRenderer();
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
    if (!address || !mapInstance.current || !window.google) return;

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
          else
            markerStartRef.current = new window.google.maps.Marker({
              position: { lat, lng },
              map: mapInstance.current,
              title: "Départ",
            });
          setAddressStart(address);
        } else {
          if (markerDestinationRef.current) markerDestinationRef.current.setPosition({ lat, lng });
          else
            markerDestinationRef.current = new window.google.maps.Marker({
              position: { lat, lng },
              map: mapInstance.current,
              title: "Destination",
            });
          setAddressDestination(address);
        }

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
      travelMode: window.google.maps.TravelMode[travelMode as keyof typeof google.maps.TravelMode],
    };

    directionsServiceRef.current.route(request, (result, status) => {
      if (status === "OK") {
        directionsRendererRef.current?.setDirections(result);
      } else {
        console.error("Erreur lors du calcul de l'itinéraire :", status);
      }
    });
  };

  const adjustCoordinates = (lat: number, lng: number, index: number) => {
    const offset = 0.00005 * index;
    return { lat: lat + offset, lng: lng + offset };
  };

  useEffect(() => {
    const newSocket = io("https://https://google-map.miantsebastien.com/");

    newSocket.on("connect", () => {
      console.log("Connecté à Socket.IO :", newSocket.id);
      currentUserId.current = newSocket.id;

      if (userLocation) {
        newSocket.emit("location", { location: userLocation });
      }
    });

    newSocket.on("userList", (userList) => {
      if (mapInstance.current) {
        userList.forEach((user: { location: { lat: number; lng: number; }; id: string | number; }, index: number) => {
          const adjustedLocation = adjustCoordinates(user.location.lat, user.location.lng, index);
          if (userMarkers.current[user.id]) {
            userMarkers.current[user.id].setPosition(adjustedLocation);
          } else {
            userMarkers.current[user.id] = new window.google.maps.Marker({
              position: adjustedLocation,
              map: mapInstance.current,
              title: `Utilisateur ${user.id}`,
              icon: {
                url: "https://cdn-icons-png.flaticon.com/512/1946/1946429.png",
                scaledSize: new window.google.maps.Size(40, 40),
              },
            });
          }
        });

        Object.keys(userMarkers.current).forEach((id) => {
          if (!userList.find((user) => user.id === id)) {
            userMarkers.current[id].setMap(null);
            delete userMarkers.current[id];
          }
        });
      }
    });

    return () => {
      newSocket.close();
    };
  }, [userLocation]);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        {/* eslint-disable-next-line react/no-unescaped-entities */}
        <h1 className="text-2xl font-bold">Carte en temps réel et calcul d'itinéraire</h1>
        <button
          onClick={() => setShowInputs(!showInputs)}
          className="bg-pink-500 text-white p-3 rounded-lg mb-4"
        >
          {showInputs ? "Masquer les champs d'adresse" : "Afficher les champs d'adresse"}
        </button>
      </div>



      {showInputs && (
        <div className="space-y-4">
          <div className="flex gap-2">
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

          <div className="flex gap-2">
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
            <div className="flex justify-around my-4">
              <button onClick={() => setTravelMode("DRIVING")} className={`p-3 rounded-lg ${travelMode === "DRIVING" ? "bg-red-500" : "bg-gray-300"} text-white`}>
                <FaCar size={20} className="inline-block mr-2" /> Voiture
              </button>
              <button onClick={() => setTravelMode("BICYCLING")} className={`p-3 rounded-lg ${travelMode === "BICYCLING" ? "bg-red-500" : "bg-gray-300"} text-white`}>
                <FaBicycle size={20} className="inline-block mr-2" /> Vélo
              </button>
              <button onClick={() => setTravelMode("WALKING")} className={`p-3 rounded-lg ${travelMode === "WALKING" ? "bg-red-500" : "bg-gray-300"} text-white`}>
                <FaWalking size={20} className="inline-block mr-2" /> Marche
              </button>
            </div>
          )}

          {showRouteButton && (
            <button onClick={calculateRoute} className="bg-green-500 text-white p-3 rounded-lg w-full">
              {/* eslint-disable-next-line react/no-unescaped-entities */}
              Afficher l'itinéraire
            </button>
          )}
        </div>
      )}

      <div className="h-[700px] w-full mt-4" ref={mapRef}></div>
    </div>
  );
}

