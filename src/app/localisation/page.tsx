"use client";
import {useEffect, useRef, useState} from "react";
import {Loader} from "@googlemaps/js-api-loader";
import {io} from "socket.io-client";

export default function GoogleMaps() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const userMarkers = useRef<{ [id: string]: google.maps.Marker }>({});

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [socket, setSocket] = useState(null);

  const initializeMap = async (lat: number, lng: number) => {
    try {
      const loader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
        version: "weekly",
      });

      await loader.load();

      if (mapRef.current && window.google) {
        const map = new window.google.maps.Map(mapRef.current, {
          center: {lat, lng},
          zoom: 14,
        });

        mapInstance.current = map;
      }
    } catch (error) {
      console.error("Erreur lors de l‘initialisation de la carte :", error);
    }
  };

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const {latitude, longitude} = position.coords;
          setUserLocation({lat: latitude, lng: longitude});
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

  useEffect(() => {
    const newSocket = io("http://localhost:3000"); // Connexion au serveur Socket.IO
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Connecté à Socket.IO :", newSocket.id);

      // Envoyer la position de l'utilisateur
      if (userLocation) {
        newSocket.emit("location", {location: userLocation});
      }
    });

    newSocket.on("updateLocation", (data) => {
      const {id, location} = data;

      if (mapInstance.current) {
        if (userMarkers.current[id]) {
          userMarkers.current[id].setPosition(location);
        } else {
          userMarkers.current[id] = new window.google.maps.Marker({
            position: location,
            map: mapInstance.current,
            title: `Utilisateur ${id}`,
            icon: {
              url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
            },
          });
        }
      }
    });

    newSocket.on("disconnect", () => {
      console.log("Déconnecté de Socket.IO");
    });

    return () => {
      newSocket.close();
    };
  }, [userLocation]);

  return (
    <div>
      <h1 className="text-2xl font-bold p-4">Carte en temps réel avec Socket.IO</h1>
      <div className="h-[700px] w-full" ref={mapRef}></div>
    </div>
  );
}
