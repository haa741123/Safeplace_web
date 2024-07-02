const key = h_config.apikey;
const MAX_CONGESTION = 0.4;

/**
 * TMap JavaScript API를 로드하는 함수
 * @param {string} key - API 키
 */
function loadTMapScript(key) {
    const script = document.createElement('script');
    script.src = `/external-api?version=1&appKey=${key}`;
    // script.async = false; // 이전에 async를 false로 설정했음
    document.head.appendChild(script);
    script.onload = () => console.log('로드 완료');
    script.onerror = (error) => console.error('TMap JavaScript API 로드 실패', error);
}


loadTMapScript(key);

/**
 * 위도와 경도를 받아 위치 정보를 전송하는 함수
 * @param {number} latitude - 위도
 * @param {number} longitude - 경도
 */
function sendLocation(latitude, longitude) {
    const latElement = document.getElementById('latitude');
    const lonElement = document.getElementById('longitude');

    if (latElement && lonElement) {
        latElement.textContent = `Latitude: ${latitude}`;
        lonElement.textContent = `Longitude: ${longitude}`;
    } else {
        console.log("위치 정보를 확인할 수 없습니다.");
    }

    reverseLabel(longitude, latitude);
}

/**
 * TMap을 초기화하는 함수
 */
function initTmap() {
    getCurrentLocation();
}

/**
 * 현재 위치를 가져오는 함수
 */
function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(showCurrentLocation, locationError);
    } else {
        console.log("Geolocation is not supported by this browser.");
        const defaultLat = 37.5665;
        const defaultLon = 126.9780;
        sendLocation(defaultLat, defaultLon);
    }
}

/**
 * 현재 위치를 표시하는 함수
 * @param {Position} position - 위치 정보 객체
 */
function showCurrentLocation(position) {
    const { latitude, longitude } = position.coords;
    console.log(`Current Location: ${latitude}, ${longitude}`);
    reverseLabel(longitude, latitude);
}

/**
 * 위치 오류를 처리하는 함수
 * @param {PositionError} error - 오류 정보 객체
 */
function locationError(error) {
    console.warn(`ERROR(${error.code}): ${error.message}`);
}

/**
 * 위도와 경도를 받아 주소를 가져오는 함수
 * @param {number} currentLon - 경도
 * @param {number} currentLat - 위도
 */
function reverseLabel(currentLon, currentLat) {
    $.ajax({
        method: "GET",
        url: "/reverse-geocode",
        data: {
            "version": "1",
            "format": "json",
            "reqLevel": "15",
            "centerLon": currentLon,
            "centerLat": currentLat,
            "reqCoordType": "WGS84GEO",
            "resCoordType": "WGS84GEO",
            "appKey": key
        },
        success: (response) => {
            const { poiInfo } = response;
            if (poiInfo) {
                const { poiLon, poiLat, id: poiId, name } = poiInfo;
                const url = `https://warmworld.shop/puzzle/${poiId}?format=json&appKey=${key}&lat=${currentLat}&lng=${currentLon}`;
                puzzle(url, name);
            } else {
                console.log("위치 정보를 찾을 수 없습니다.");
            }
        },
        error: (request, status, error) => {
            console.log(`code: ${request.status}\nmessage: ${request.responseText}\nerror: ${error}`);
        }
    });
}

/**
 * 장소 정보와 혼잡도를 가져오는 함수
 * @param {string} url - API 요청 URL
 * @param {string} name - 장소 이름
 */
function puzzle(url, name) {
    $.ajax({
        method: "GET",
        url: url,
        success: (response) => {
            const { poiName, rltm } = response.contents;
            if (rltm && rltm.length > 0) {
                const data = rltm.find(item => item.type === 2);
                if (data) {
                    const { congestion, congestionLevel, datetime } = data;
                    const densityPercentage = ((congestion / MAX_CONGESTION) * 100).toFixed(2);
                    const congestText = congestionLevelText(congestionLevel);
                    const statusText = statusLevelText(congestionLevel);
                    const dateStr = formatDate(datetime);

                    $("#loc_main").text(poiName);
                    animateDensityValue(densityPercentage);
                    updateUI(dateStr, statusText, congestText, densityPercentage, datetime);
                } else {
                    console.log(`해당 위치는 실시간 장소 혼잡도를 지원하고 있지 않습니다.`);
                }
            } else {
                console.log(`해당 위치는 실시간 장소 혼잡도를 지원하고 있지 않습니다.`);
            }
        },
        error: (request, status, error) => {
            console.log(`code: ${request.status}\nmessage: ${request.responseText}\nerror: ${error}`);
        }
    });
}

function formatDate(datetime) {
    const year = datetime.substr(0, 4);
    const month = datetime.substr(4, 2);
    const day = datetime.substr(6, 2);
    const hour = datetime.substr(8, 2);
    const minute = datetime.substr(10, 2);
    const second = datetime.substr(12, 2);

    // ISO 8601 날짜 형식으로 변환 (예: "2024-07-03T07:05:00")
    const dateStr = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
    const dateObj = new Date(dateStr);

    // 날짜 객체가 유효하지 않은 경우, 오류 메시지 출력
    if (isNaN(dateObj.getTime())) {
        console.error("Invalid date constructed", dateStr);
        return "날짜 형식 오류";
    }

    // 올바른 날짜 형식으로 변환하여 반환
    const options = {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true
    };
    return dateObj.toLocaleString('ko-KR', options);
}



/**
 * 혼잡도 단계를 텍스트로 변환하는 함수
 * @param {number} congestionLevel - 혼잡도 단계
 * @returns {string} 혼잡도 텍스트
 */
function congestionLevelText(congestionLevel) {
    const levels = ["알 수 없음", "여유", "보통", "혼잡", "매우 혼잡"];
    return levels[congestionLevel] || levels[0];
}

/**
 * 혼잡도 상태를 텍스트로 변환하는 함수
 * @param {number} congestionLevel - 혼잡도 단계
 * @returns {string} 상태 텍스트
 */
function statusLevelText(congestionLevel) {
    const statuses = ["알 수 없음", "안전합니다", "보통입니다", "주의하세요", "위험합니다"];
    return statuses[congestionLevel] || levels[0];
}

/**
 * 혼잡도 값을 애니메이션으로 표시하는 함수
 * @param {number} targetValue - 목표 혼잡도 값
 */
function animateDensityValue(targetValue) {
    let densityElement = document.getElementById('density_val');
    let currentValue = 0; // 초기화를 0으로 변경

    const duration = 2000;
    const increment = targetValue / (duration / 20);

    function updateValue() {
        currentValue += increment;
        if (currentValue >= targetValue) {
            currentValue = targetValue;
            clearInterval(interval);
        }
        if (typeof currentValue === 'number') {
            densityElement.textContent = `${currentValue.toFixed(2)}%`;
        } else {
            console.error('currentValue is not a number:', currentValue);
        }
    }

    const interval = setInterval(updateValue, 20);
}



/**
 * UI 업데이트 함수
 * @param {string} dateStr - 날짜 문자열
 * @param {string} statusText - 상태 텍스트
 * @param {string} congestText - 혼잡도 텍스트
 * @param {number} densityPercentage - 혼잡도 백분율
 * @param {string} datetime - 날짜 시간 문자열
 */
function updateUI(dateStr, statusText, congestText, densityPercentage, datetime) {
    const stageElement = document.getElementById('density_stage');
    const statusElement = document.getElementById('status');
    
    $('#server_date').text(dateStr.split(' ')[0]);
    $('#server_time').text(dateStr.split(' ')[1]);
    $('#density_stage').text(congestText);
    $('#status').text(statusText);
    
    stageElement.style.color = getColorForCongestion(congestText);
    statusElement.style.color = getColorForStatus(statusText);
    statusElement.classList.toggle('blink', statusText === "주의하세요" || statusText === "위험합니다");
}

/**
 * 혼잡도 텍스트에 따라 색상을 반환하는 함수
 * @param {string} congestText - 혼잡도 텍스트
 * @returns {string} 색상 코드
 */
function getColorForCongestion(congestText) {
    const colors = {
        "여유": '#1D64F2',
        "보통": '#BFF207',
        "혼잡": '#F2A950',
        "매우 혼잡": '#F24822'
    };
    return colors[congestText] || 'black';
}

/**
 * 상태 텍스트에 따라 색상을 반환하는 함수
 * @param {string} statusText - 상태 텍스트
 * @returns {string} 색상 코드
 */
function getColorForStatus(statusText) {
    const colors = {
        "안전합니다": '#1D64F2',
        "보통입니다": '#BFF207',
        "주의하세요": '#F2A950',
        "위험합니다": '#F24822'
    };
    return colors[statusText] || 'black';
}
