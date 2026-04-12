# ESP32 tests for MyoQuack

## LedCounterWiFi

Prueba simple sin sensores: el ESP32 se conecta por WiFi, prende el LED integrado y manda el conteo a la API de Railway. La web en Vercel puede ver el resultado al refrescar la seccion `Test-Esp32` o `Reportes`.

## Que necesitas

- Arduino IDE.
- Soporte de placas ESP32 instalado en Arduino IDE.
- Red WiFi 2.4 GHz.
- Un paciente existente en MyoQuack.
- Tu sesion iniciada en la web para copiar el token.

## Pasos

1. Abre la pagina `Test-Esp32`.
2. Selecciona el paciente que usaras para la prueba.
3. Presiona `Copiar token para ESP32`.
4. Abre `ESP32/LedCounterWiFi/LedCounterWiFi.ino`.
5. Cambia estos valores:

```cpp
const char* WIFI_SSID = "TU_WIFI";
const char* WIFI_PASSWORD = "TU_PASSWORD_WIFI";
const char* JWT_TOKEN = "PEGA_AQUI_EL_TOKEN_DE_LA_PAGINA";
const char* PATIENT_ID = "P-0001";
```

6. En Arduino IDE selecciona tu placa ESP32 y el puerto.
7. Sube el sketch.
8. Abre el Monitor Serial a `115200`.
9. Cada 10 segundos el LED se prende y el ESP32 manda el conteo a Railway.
10. En la web presiona `Refrescar reportes` para ver las pruebas guardadas.

## Boton opcional

El sketch tambien escucha un boton en `GPIO 4` usando `INPUT_PULLUP`. Conecta un boton entre `GPIO 4` y `GND`. Cada vez que lo presiones, el LED se prende y se manda el conteo.

## Notas

- Si tu placa no usa `GPIO 2` para el LED integrado, cambia `LED_PIN`.
- No subas a GitHub un token real ni tu password de WiFi.
- El token JWT expira; si deja de funcionar, copia uno nuevo desde la pagina.
