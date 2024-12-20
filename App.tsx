import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  Button
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import axios from 'axios';

const WEATHER_API_KEY = 'f4b88f3d7aa6d8e2bb73b292109427ed'; // 替换为你的API Key
const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

const App: React.FC = () => {
  const [location, setLocation] = useState<{ latitude: number; longitude: number; } | null>(null);
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          setErrorMsg('Location permission denied');
          setLoading(false);
          return;
        }
      }
      getCurrentLocation();
    })();
  }, []);

  const getCurrentLocation = () => {
    setLoading(true);
    setErrorMsg('');
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ latitude, longitude });
        fetchWeatherData(latitude, longitude);
      },
      (error) => {
        setErrorMsg(error.message);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000
      }
    );
  };

  const fetchWeatherData = async (lat: number, lon: number) => {
    try {
      const response = await axios.get(`${BASE_URL}?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric`);
      setWeather(response.data);
      setLoading(false);
    } catch (err) {
      setErrorMsg('Failed to fetch weather data');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{errorMsg}</Text>
        <Button title="Retry" onPress={getCurrentLocation} />
      </View>
    );
  }

  if (!weather) {
    return (
      <View style={styles.center}>
        <Text>No weather data available</Text>
        <Button title="Retry" onPress={getCurrentLocation} />
      </View>
    );
  }

  // 提取所需信息
  const {
    name,
    sys: { country },
    coord: { lat, lon },
    weather: weatherArray,
    main: { temp, temp_min, temp_max, pressure, sea_level, grnd_level, humidity },
    wind: { speed, deg },
    visibility,
    timezone,
    rain,
    snow
  } = weather;

  const { main: conditionMain, description } = weatherArray[0];

  // 格式化时区
  const timezoneOffsetHours = timezone / 3600;
  const timezoneString = `UTC${timezoneOffsetHours >= 0 ? '+' : ''}${timezoneOffsetHours}`;

  // 风向转文字描述
  const windDirection = getWindDirection(deg);

  // 处理降水量
  let precipitationInfo = '';
  if (rain && (rain['1h'] || rain['3h'])) {
    const rainAmount = rain['1h'] || rain['3h'];
    precipitationInfo = `Rain: ${rainAmount} mm`;
  } else if (snow && (snow['1h'] || snow['3h'])) {
    const snowAmount = snow['1h'] || snow['3h'];
    precipitationInfo = `Snow: ${snowAmount} mm`;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Weather in {name}, {country}</Text>

      {/* 天气条件分类 */}
      <Text style={styles.categoryTitle}>Weather Conditions</Text>
      <InfoRow label="Main" value={conditionMain} />
      <InfoRow label="Description" value={description} />
      <InfoRow label="Current Temp" value={`${temp} °C`} />
      <InfoRow label="Min Temp" value={`${temp_min} °C`} />
      <InfoRow label="Max Temp" value={`${temp_max} °C`} />
      <InfoRow label="Humidity" value={`${humidity}%`} />
      {precipitationInfo ? <InfoRow label="Precipitation" value={precipitationInfo} /> : null}

      {/* 风与气压分类 */}
      <Text style={styles.categoryTitle}>Wind & Pressure</Text>
      <InfoRow label="Wind Speed" value={`${speed} m/s`} />
      <InfoRow label="Wind Direction" value={`${deg}° (${windDirection})`} />
      <InfoRow label="Pressure" value={`${pressure} hPa`} />
      {sea_level !== undefined && <InfoRow label="Sea Level Pressure" value={`${sea_level} hPa`} />}
      {grnd_level !== undefined && <InfoRow label="Ground Level Pressure" value={`${grnd_level} hPa`} />}
      <InfoRow label="Visibility" value={`${visibility} m`} />

      {/* 地理位置与时区分类 */}
      <Text style={styles.categoryTitle}>Location & Timezone</Text>
      <InfoRow label="Location" value={`${lat}, ${lon}`} />
      <InfoRow label="Timezone" value={timezoneString} />

      <View style={{ marginTop: 20 }}>
        <Button title="Refresh" onPress={getCurrentLocation} />
      </View>
    </View>
  );
};

function InfoRow({ label, value }: { label: string, value: string }) {
  return (
    <View style={styles.infoContainer}>
      <Text style={styles.label}>{label}:</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function getWindDirection(deg: number): string {
  if (deg > 337.5 || deg <= 22.5) return 'N';
  else if (deg <= 67.5) return 'NE';
  else if (deg <= 112.5) return 'E';
  else if (deg <= 157.5) return 'SE';
  else if (deg <= 202.5) return 'S';
  else if (deg <= 247.5) return 'SW';
  else if (deg <= 292.5) return 'W';
  else return 'NW';
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 20,
    backgroundColor: '#F5F5F5'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center'
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginVertical: 10,
    color: '#333'
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 10,
    color: '#333'
  },
  value: {
    fontSize: 16,
    fontWeight: '400',
    color: '#555'
  },
  infoContainer: {
    flexDirection: 'row',
    marginVertical: 5,
    alignItems: 'baseline'
  },
  error: {
    color: 'red',
    fontSize: 16
  }
});

export default App;
