const awsTranscribeServer = "https://my-tour-clips-transcriptions.s3.amazonaws.com/";
const awsServer = "https://livecapture-420.s3.amazonaws.com/";
const imgServer = "https://thumbnails-420.s3.amazonaws.com/";
const apiServer = "https://list.addyourtour.com/";
const langServer = "https://langs.addyourtour.com/";
mapboxgl.accessToken =
    "pk.eyJ1Ijoid3d3bWFzdGVyMSIsImEiOiJjazZmbmxhYngwYjQxM2xtdDdwMjJzYjdnIn0._QtAdUTg9NtC9_R8Caq6Ng";
let nameKey = null;
let map = null;
let wavesurfer = null;
let tourCoordinates = [];
let audioFile = null;
let tourJson2 = null; // tour json2 data
let marker = null;
let photoMarkers = [];
let currentTime = 0;
let totalNoOfSeconds = 0;
let tourClips = [];
let convertedStart = 0;
let convertedEnd = 0;
let clippedCoordinates = [];
let marker1 = null;
let selectedGalleryImages = {'image_type': '', 'src': '', 'img_id': ''};
let selectedGalleryImagesOld = "";

let clippedGeometry = {
    id: "clipLine",
    type: "Feature",
    properties: {isNew: true, index: -1},
    geometry: {
        type: "LineString",
        coordinates: [],
    },
};


function resize() {
    $('#main-div').css('maxHeight', $(window).height() - 190);
}

$(window).resize(resize);
resize();
appStart();
var newClipPhotos = {};
var tourNames = JSON.parse(getCookie("tour_names"));
function setCookie(cname, cvalue, exdays) {
    const d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    let expires = "expires=" + d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";domain=.addyourtour.com;";
}

function getCookie(cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for(let i = 0; i <ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}
async function login() {
    if (!window.ethereum) {
        alert('MetaMask not detected. Please install MetaMask first.');
        return;
    } else {
        const accounts = await ethereum.request({method: 'eth_requestAccounts'});
        setCookie('public_key', accounts[0], 0.1);
        alert("Logged-in successfully");
        checkLogin();
    }
}

checkLogin();
function checkLogin(){
    var userEth = getCookie('public_key');
    if (userEth !== "") {
        $('#login-btn').fadeOut();
        if (tourJson2 !== null) {
            if (tourJson2.METADATA.USER_ETHWALLET === userEth || tourJson2.METADATA.USER_ETHWALLET === ""){
				$('#nachotour').fadeOut();
                $('#loggedin').fadeIn();
            } else {
                $('#loggedin').fadeOut();
				$('#nachotour').fadeIn();
            }
        } 
		//else {
        //    $('#loggedin').fadeOut();
        //}
    } else {
        $('#login-btn').fadeIn();
        $('#loggedin').fadeOut();
    }
}
function addClip(){
    let clip = {IS_FOR_REVIEW: $('#review-check')[0].checked};
    clip.START = convertedStart;
    clip.END = convertedEnd;
    clip.CLIP_NAME = document.getElementById("clip_name").value;
    var allClipNames = tourJson2.CLIPS.map(c => c.CLIP_NAME);
    if (allClipNames.indexOf(clip.CLIP_NAME) !== -1) {
        alert("Clip name already exists");
        return;
    }
    clip.CLIP_FILE = "";
    clip.CLIP_PHOTO = "";
    if (clip.CLIP_NAME == null || clip.CLIP_NAME == '') {
        alert("Clip name is required");
        return;
    }
    if (clippedGeometry.geometry.coordinates.length === 0) {
        alert("Clip geometry is not ready. Click on the clip button");
        return;
    }
    if (selectedGalleryImages.image_type !== '') {
        var srcSpl = selectedGalleryImages.src.split('/')
        clip.CLIP_PHOTO = srcSpl[srcSpl.length - 1];
        let latLong = clippedGeometry.geometry.coordinates[0];
        if (selectedGalleryImages.image_type === 'new') {
            newClipPhotos[clip.CLIP_PHOTO] = selectedGalleryImages.src;
            tourJson2.PHOTOS.push({
                COORDINATES:{
                    ELEV: 0,
                    HEADING: 0,
                    LAT: latLong[1],
                    LONG: latLong[0]
                },
                FILE: clip.CLIP_PHOTO,
                TIMESTAMP: convertedEnd
            });
        }
    }
    // let geometry = clippedGeometry.geometry
    clip.CLIP_PATH = JSON.parse(JSON.stringify(clippedGeometry.geometry));
	// console.log(clip);
    clip.TRANSCRIPTION = "";
    tourJson2.CLIPS.push(clip);
    success();
    $('#add-clip-btn').click();
	
}

function removeTour(){
	 if (confirm("Are you sure you want to remove this tour from your portfolio?")) {
	 	delete tourNames[nameKey];
		setCookie("tour_names", JSON.stringify(tourNames), 10); 
		currentSelect = document.getElementById("tourSelect")
		currentOption = currentSelect.selectedIndex;
		currentSelect.options[currentOption].remove();
		currentSelect.options[currentOption].selected = "true";
		if ("createEvent" in document) {
			var evt = document.createEvent("HTMLEvents");
			evt.initEvent("change", false, true);
			currentSelect.dispatchEvent(evt);
		} else currentSelect.fireEvent("onchange");
	 }
}

function saveChanges(withLogin = true) {
    if (getCookie('public_key') === "" && withLogin) {
        checkLogin();
        alert("You are not login. Please login");
        return;
    }
    if (withLogin){
        tourJson2.METADATA.USER_ETHWALLET = getCookie('public_key');
    }
    $.ajax({
        url: 'https://review.addyourtour.com/uploads/upload.php',
        method: 'post',
        dataType: 'json',
        data: {json2_file_name: nameKey, photos: JSON.stringify(newClipPhotos), json2: JSON.stringify(tourJson2)},
        success: function (results) {
            if (results.status) {
                if (withLogin){
                    alert("Successfully saved changes.");
                }
                updateTourData(nameKey);
            } else {
                if (withLogin){
                    alert(results.error);
                }
            }
        },
        error: function (error) {
            if (withLogin){
                alert("Failed to save changes.")
            }
        }
    })
}

function clearClipGeometry() {
    // clippedGeometry.geometry.coordinates = [];
    // clippedGeometry.properties.isNew = true;
    // clippedGeometry.properties.index = -1;
    try {
        Draw.deleteAll();
    }catch (e) {
    }
}

async function fetchClipTranscription(filename) {
    const response = await fetch(`${awsTranscribeServer}${filename}`, {cache: "no-cache"});
    if (response.ok) {
        const transcription = await response.json();
        return transcription;
    } else {
        return "";
    }
}

async function appStart() {
    if (getCookie("tour_names") === ""){
        setCookie("tour_names", JSON.stringify({}), 10);
    }
    const appUrl = window.location.href;
    let urlParams = appUrl.split("#");
    if (urlParams.length > 0) {
        nameKey = urlParams[1];
    }

    initWaveSurfer();

    initMap();

    const tours = await fetchTours();
    // add dropdown options for selecting tour data
    const tourSelectElement = document.getElementById("tourSelect");
    tours.forEach((tour) => {
        var opt = document.createElement("option");
        opt.value = tour.name;
        opt.innerHTML = tour.name;
        if (tourNames.hasOwnProperty(tour.name)) {
            opt.innerHTML = tourNames[tour.name];
        }
        if (tour.name) {
            tourSelectElement.appendChild(opt);
        }
    });
    if (nameKey) {
        tourSelectElement.value = nameKey;
    } else {
        nameKey = tours[0].name;
        tourSelectElement.value = nameKey;
    }


    // if (map.isSourceLoaded("route")) {
    //     updateTourData(nameKey);
    // } else {
    //
    // }

    const Languages = await fetchLanguages();
    // add dropdown options for selecting language data
    const LanguageselectElement = document.getElementById("languageSelect");
    Languages.forEach((language) => {
        var opt = document.createElement("option");
        opt.value = language.id;
        opt.innerHTML = language.Language;
        if (language.Language) {
            LanguageselectElement.appendChild(opt);
        }
    });

    // JavaScript Document

    document
        .getElementById("tourSelect")
        .addEventListener("change", async (event) => {
            //nameKey = this.options[this.selectedIndex].value;
            nameKey = event.target.value;
            window.history.pushState({}, "", "#" + nameKey);
            document.getElementById("playPause").style.display = "none";
            document.getElementById("speed-select").style.display = "none";
            document.getElementById("pointSecond").style.display = "none";
            document.getElementById("playPauseIcon").classList.remove("fa-pause");
            document.getElementById("clip_edit").classList.remove("active");
            document.getElementById("playPauseIcon").classList.add("fa-play");
            document.getElementById("runAudioTime").value = "00:00:00";
            document.getElementById("fullAudioTime").value = "00:00:00";
            updateTourData(nameKey);
        });

    document
        .getElementById("clip_edit")
        .addEventListener("click", async (event) => {
            document.getElementById("clip_edit").classList.add("active");
            editform();
        });

    $(document).on("click", ".accordion-button",async function (e) {
        if (e.target.className.indexOf('collapsed') !== -1){
            clearClipGeometry();
			$("#add-clip-btn").prop("disabled",false);
            var currentTourMp3 = `${awsServer}${nameKey}.mp3`;
            if (audioFile !== currentTourMp3) {
                audioFile = currentTourMp3;
                wavesurfer.load(audioFile);
                document.getElementById("playPauseIcon").classList.remove("fa-pause");
                document.getElementById("playPauseIcon").classList.add("fa-play");
            }
            return;
        }
		$("#add-clip-btn").prop("disabled",true);
        let name = e.target.innerText;
        var isTourHasNewTxt = false;
        for (let i = 0; i < tourJson2.CLIPS.length; i++) {
            if (tourJson2.CLIPS[i].CLIP_NAME == name) {
                clippedGeometry.geometry = tourJson2.CLIPS[i].CLIP_PATH;
                clippedGeometry.properties.isNew = false;
                clippedGeometry.properties.index = i;
                convertedStart = tourJson2.CLIPS[i].START;
                convertedEnd = tourJson2.CLIPS[i].END;
                addFeatureToEdit();
                if (tourJson2.CLIPS[i].CLIP_FILE.indexOf(".mp3") !== -1){
                    audioFile = `${awsServer}${tourJson2.CLIPS[i].CLIP_FILE}`;
                    wavesurfer.load(audioFile);
                    if (tourJson2.CLIPS[i].TRANSCRIPTION === ""){
                        var transcription = await fetchClipTranscription(tourJson2.CLIPS[i].CLIP_FILE + ".txt");
                        try {
                            transcription = transcription.results.transcripts.map(tr => tr.transcript);
                            $('#clip-transcription-'+i).text(transcription.join("<br>"));
                            tourJson2.CLIPS[i].TRANSCRIPTION = transcription.join("<br>");
                            isTourHasNewTxt = true;
                        }catch (e) {
                            $('#clip-transcription-'+i).text("Transcription is still in progress...");
                        }
                    } else {
                        $('#clip-transcription-'+i).text(tourJson2.CLIPS[i].TRANSCRIPTION);
                    }

                }
                try {
                    var bb = turf.bbox(clippedGeometry);
                    map.fitBounds([[bb[0], bb[1]], [bb[2], bb[3]]], {padding: 50});
                }catch (e) {

                }
                break;
            }
        }
        if (isTourHasNewTxt){
            saveChanges(false);
        }

    });

    // const addClip = () => {

    document
        .getElementById("add-clip-btn")
        .addEventListener("click", (event) => {
            clearClipGeometry();
            if (event.target.innerText == '+') {
                event.target.innerText = '-';
				
                //$('#startdate, #enddate').val('00:00:00');
                $('#startdate').val($('#runAudioTime').text())
                $('#enddate').val('');
                $('#add-clip-div').fadeIn();
                $('#clipsAccordion').fadeOut();
                $('#clip_name').val('');
				$('#clip_image').attr('src', 'css/gallery.png');
                clippedGeometry.properties.isNew = true
				clippedGeometry.properties.index = -1;
            } else {
                event.target.innerText = '+';
                $('#add-clip-div').fadeOut();
                $('#clipsAccordion').fadeIn();
                clippedGeometry.properties.isNew = false
            }
        });


}
document
    .getElementById("clipLineString")
    .addEventListener("click", async (event) => {
        clippedGeometry.properties.isNew = true
        postClip()
    });

function postClip(isFromClip = false) {
    var stEl = clippedGeometry.properties.isNew ? "startdate": "startdate"+clippedGeometry.properties.index;
    var enEl = clippedGeometry.properties.isNew ? "enddate": "enddate"+clippedGeometry.properties.index;
    const st = document.getElementById(stEl).value;
    convertedStart = convert_time_to_seconds(st);
    const et = document.getElementById(enEl).value;
    convertedEnd = convert_time_to_seconds(et);
    if (!isNaN(convertedStart) && convertedEnd > 0) {
        clipGeometry();
    } else {
        alert("Clip length is too short. Please use player or click on the line and stop the player.")
    }
}

function saveClipByIndex() {
    tourJson2.CLIPS[clippedGeometry.properties.index].CLIP_PATH = clippedGeometry.geometry;
    tourJson2.CLIPS[clippedGeometry.properties.index].IS_FOR_REVIEW = $('#review-check'+clippedGeometry.properties.index)[0].checked;
    tourJson2.CLIPS[clippedGeometry.properties.index].CLIP_NAME = $('#clip_name'+clippedGeometry.properties.index).val();
    tourJson2.CLIPS[clippedGeometry.properties.index].END = convert_time_to_seconds($('#startdate'+clippedGeometry.properties.index).val());
    tourJson2.CLIPS[clippedGeometry.properties.index].START = convert_time_to_seconds($('#enddate'+clippedGeometry.properties.index).val());
    var trVal = $('#clip-transcription-'+clippedGeometry.properties.index).val();
    if (trVal !== "" && trVal !== "Transcription is still in progress...") {
        tourJson2.CLIPS[clippedGeometry.properties.index].TRANSCRIPTION = trVal;
    }
	
	$('#accordion'+clippedGeometry.properties.index).click();
	$('#accordion'+clippedGeometry.properties.index).click();
}

function smoothLineFunction(isChecked) {
    if (isChecked) {
        if (clippedGeometry !== undefined){
            var dFts = Draw.getAll();
            // console.log(clippedGeometry.geometry.coordinates);
            if (dFts.features[0] !== undefined && dFts.features[0].geometry.coordinates.length > 2){
                var cc = dFts.features[0].geometry.coordinates;
                clippedGeometry.geometry.coordinates =    [cc[0], cc[cc.length -1]];
                addFeatureToEdit();
            }
            // clippedGeometry.geometry.coordinates = turf.cleanCoords(dFts.features[0]).geometry.coordinates;
            // console.log(clippedGeometry.geometry.coordinates);
            // clippedGeometry.geometry.coordinates = smooth(dFts.features[0].geometry.coordinates);

        }
    } else {
        if (clippedGeometry !== undefined){
            clipGeometry();
        }
    }
}
function onStartChange() {
    var waveText = convert_time_to_seconds($('#runAudioTime').text());
    var stEl = clippedGeometry.properties.isNew ? "#startdate": "#startdate"+clippedGeometry.properties.index;
    var enEl = clippedGeometry.properties.isNew ? "#enddate": "#enddate"+clippedGeometry.properties.index;
    var stVal = convert_time_to_seconds($(stEl).val());
    var enVal = convert_time_to_seconds($(enEl).val());
    if (!isNaN(enVal) && !isNaN(stVal)){
        if (stVal === 0 && waveText !== stVal){
            $('#runAudioTime').text('00:00:00');
            wavesurfer.stop()
        } else if (waveText !== stVal) {
            wavesurfer.play(stVal-1, stVal);
        }
    }
}

function onEndChange() {

    var waveText = convert_time_to_seconds($('#runAudioTime').text());
    var stEl = clippedGeometry.properties.isNew ? "#startdate": "#startdate"+clippedGeometry.properties.index;
    var enEl = clippedGeometry.properties.isNew ? "#enddate": "#enddate"+clippedGeometry.properties.index;

    var stVal = convert_time_to_seconds($(stEl).val());
    var enVal = convert_time_to_seconds($(enEl).val());
    if (!isNaN(enVal) && !isNaN(stVal) && $(enEl).val().length === 8){
        if (enVal <= stVal){
            $(enEl).val($(stEl).val());
            alert("End time must be greater then start");
            return;
        }
        if (enVal !== 0 && waveText !== enVal) {
            wavesurfer.play(enVal-1, enVal);
        }
    }
}

function addFeatureToEdit(){
    Draw.deleteAll();
    var ftIDS = Draw.add(clippedGeometry.geometry);
    Draw.changeMode('simple_select', { featureIds: ftIDS });
}

function setClipTime(pos) {
    var stEl = clippedGeometry.properties.isNew ? "#startdate": "#startdate"+clippedGeometry.properties.index;
    var enEl = clippedGeometry.properties.isNew ? "#enddate": "#enddate"+clippedGeometry.properties.index;
    if (pos === 'left' || pos === true) {
        $(stEl).val($('#runAudioTime').text())
    } else {
        $(enEl).val($('#runAudioTime').text());
    }
    const st =  $(stEl).val();
    const et = $(enEl).val();
    convertedStart = convert_time_to_seconds(st);
    convertedEnd   = convert_time_to_seconds(et);
	if (!isNaN(convertedStart) && isNaN(convertedEnd) || convertedStart > convertedEnd){
        $(enEl).val($('#runAudioTime').text());
	}
    //if (!isNaN(convertedStart) && convertedEnd > 0) {
    //    if (convertedEnd > convertedStart){
    //        clipGeometry();
    //    } else {
    //        alert("Clip length is not valid");
    //    }
    //}
}

function clipGeometry() {
    clearClipGeometry();
    clippedCoordinates = [];
    for (let i = convertedStart; i < tourCoordinates.length; i++) {
        clippedCoordinates.push(tourCoordinates[i]);
        if (i == convertedEnd) {
            break;
        }
    }
    if (document.getElementById("smooth-line").checked) {
        // clippedCoordinates = smooth(clippedCoordinates);
        if (clippedCoordinates.length > 2){
            var cc = clippedCoordinates;
            clippedCoordinates =   [cc[0], cc[cc.length -1]];
        }
    }
    clippedGeometry.geometry.coordinates = clippedCoordinates;
    addFeatureToEdit();
    var bb = turf.bbox(clippedGeometry);
    map.fitBounds([[bb[0], bb[1]], [bb[2], bb[3]]], {padding: 50});
}

const convert_time_to_seconds = (time) => {
    const [hours, minutes, seconds] = time.split(":");
    return Number(hours) * 60 * 60 + Number(minutes) * 60 + Number(seconds);
};
function setSpeed(val) {
    if (wavesurfer !== null) {
        wavesurfer.setPlaybackRate(val)
    }
}
async function initWaveSurfer() {
    // load wavsurfer
    wavesurfer = WaveSurfer.create({
        container: "#waveform",
        waveColor: "#F5F5DC",
        progressColor: "#77bbff",
        barHeight: 2,
        normalize: true,
        barWidth: 3,
    });

    wavesurfer.on("loading", (e) => {
        $('#tour-mp3-status').text("Loading track... " + e + "%");
        if (e == 100){
            $('#tour-mp3-status').text("");
        }
    });
    wavesurfer.on("error", (e) => {
        // console.log(Object.keys(e));
        if (e.toString().indexOf("404") !== -1) {
            $('#tour-mp3-status').text("Track not found.");
        } else {
            $('#tour-mp3-status').text("Failed to load the track.");
        }

    });

    wavesurfer.on("audioprocess", (e) => {
        var newTime = Math.round(wavesurfer.getCurrentTime());
        if (typeof newTime !== "undefined" && currentTime !== newTime) {
            currentTime = newTime;
        }

        document.getElementById("runAudioTime").innerHTML = new Date(newTime * 1000)
            .toISOString()
            .substr(11, 8);
        if (clippedGeometry.properties.isNew){
            if (tourCoordinates[newTime]) {
                marker.setLngLat(tourCoordinates[newTime]);
            }
        } else {
            if (clippedGeometry.geometry.coordinates[newTime]) {
                marker.setLngLat(clippedGeometry.geometry.coordinates[newTime]);
            }
        }

    });

    wavesurfer.on("finish", (e) => {
        document.getElementById("playPauseIcon").classList.remove("fa-pause");
        document.getElementById("playPauseIcon").classList.add("fa-play");
    });

    wavesurfer.on("ready", (e) => {
        let audioTime = Math.round(wavesurfer.getDuration());
        totalNoOfSeconds = audioTime;
        // console.log(totalNoOfSeconds, "totalNumberOfSeconds");
        document.getElementById("noOfSeconds").innerHTML = audioTime;
        document.getElementById("fullAudioTime").innerHTML = new Date(
            audioTime * 1000
        )
            .toISOString()
            .substr(11, 8);
        document.getElementById("runAudioTime").innerHTML = "00:00:00";
        document.getElementById("playPause").style.display = "block";
        document.getElementById("speed-select").style.display = "block";
        document.getElementById("timeCounter").style.display = "block";
        document.getElementById("pointSecond").style.display = "block";
    });

    document.querySelector("#playPause").addEventListener("click", async () => {
        if (wavesurfer.isPlaying()) {
            wavesurfer.pause();
            document.getElementById("playPauseIcon").classList.remove("fa-pause");
            document.getElementById("playPauseIcon").classList.add("fa-play");
            // console.log("stop");
            if ($('#add-clip-div').css('display') == 'block'){
                $('#enddate').val($('#runAudioTime').text())
            }
        } else {
            wavesurfer.play();
            document.getElementById("playPauseIcon").classList.remove("fa-play");
            document.getElementById("playPauseIcon").classList.add("fa-pause");
            // console.log("start");
        }
    });
}

var Draw;

async function initMap() {
    map = new mapboxgl.Map({
        container: "map",
        style: "mapbox://styles/mapbox/dark-v10",
        center: [0, 0],
        zoom: 0,
        maxZoom: 24
    });

    map.on("load", () => {
        map.addSource("route", {
            type: "geojson",
            data: {
                type: "Feature",
                properties: {},
                geometry: {
                    type: "LineString",
                    coordinates: tourCoordinates,
                },
            },
        });
        map.addSource("route-photos", {
            type: "geojson",
            data: {
                "type": "FeatureCollection",
                "features": []
            },
        });

        map.addLayer({
            id: "route",
            type: "line",
            source: "route",
            layout: {
                "line-join": "round",
                "line-cap": "round",
            },
            paint: {
                "line-color": "#1E90FF",
                "line-width": 8,
            },
        });

        /* User enter mouse on map features */
        map.on("mouseenter", "route", () => {
            map.getCanvas().style.cursor = "pointer";
        });

        /* User leave mouse on map features */
        map.on("mouseleave", "route", () => {
            map.getCanvas().style.cursor = "";
        });

        /* When user click on map */
        map.on("click", "route", (e) => {
            let clickedPoints = [];
            clickedPoints.push(e.lngLat.wrap().lng);
            clickedPoints.push(e.lngLat.wrap().lat);

            const addAbsDelta = (g) => (s, v, i) => s + Math.abs(v - g[i]);

            var goal = clickedPoints,
                result = tourCoordinates.reduce((a, b) =>
                    a.reduce(addAbsDelta(goal), 0) < b.reduce(addAbsDelta(goal), 0)
                        ? a
                        : b
                );

            let slectedIndex = 0;
            for (var i = 0; i < tourCoordinates.length; i++) {
                if (
                    tourCoordinates[i][0] == result[0] &&
                    tourCoordinates[i][1] == result[1]
                ) {
                    slectedIndex = i;
                    break;
                }
            }
            if (Draw.getMode() === "simple_select") {
                marker.setLngLat(result);
                wavesurfer.play();
                wavesurfer.play(slectedIndex, totalNoOfSeconds);
                document.getElementById("playPauseIcon").classList.remove("fa-play");
                document.getElementById("playPauseIcon").classList.add("fa-pause");
            }
        });


        var style = [
            // ACTIVE (being drawn)
            // line stroke
            {
                "id": "gl-draw-line",
                "type": "line",
                "filter": ["all", ["==", "$type", "LineString"], ["!=", "mode", "static"]],
                "layout": {
                    "line-cap": "round",
                    "line-join": "round"
                },
                "paint": {
                    "line-color": "#81FD94",
                    "line-width": 8
                }
            },
            // vertex point halos
            {
                "id": "gl-draw-polygon-and-line-vertex-halo-active",
                "type": "circle",
                "filter": ["all", ["==", "meta", "vertex"], ["==", "$type", "Point"], ["!=", "mode", "static"]],
                "paint": {
                    "circle-radius": 8,
                    "circle-color": "#FFF"
                }
            },
            // vertex points
            {
                "id": "gl-draw-polygon-and-line-vertex-active",
                "type": "circle",
                "filter": ["all", ["==", "meta", "vertex"], ["==", "$type", "Point"], ["!=", "mode", "static"]],
                "paint": {
                    "circle-radius": 5,
                    "circle-color": "#fff",
                }
            },
            {
                'id': 'gl-draw-polygon-midpoint',
                'type': 'circle',
                'filter': ['all',
                    ['==', '$type', 'Point'],
                    ['==', 'meta', 'midpoint']],
                'paint': {
                    'circle-radius': 3,
                    'circle-color': '#fbb03b'
                }
            },
            // INACTIVE (static, already drawn)
            // line stroke
            {
                "id": "gl-draw-line-static",
                "type": "line",
                "filter": ["all", ["==", "$type", "LineString"], ["==", "mode", "static"]],
                "layout": {
                    "line-cap": "round",
                    "line-join": "round"
                },
                "paint": {
                    "line-color": "#000",
                    "line-width": 3
                }
            }
        ];
        let modes = MapboxDraw.modes;
        modes = MapboxDrawWaypoint.enable(modes);
        Draw = new MapboxDraw({
            modes: modes,
            displayControlsDefault: false,
            styles: style,
            controls: {}
        });



        map.addControl(Draw, "bottom-left");
        map.on('draw.update', (e) => {
            if(clippedGeometry.geometry.coordinates.length > 0) {
                if (clippedGeometry.geometry.coordinates.length < e.features[0].geometry.coordinates.length){
                    isMiddleVertix = false;
                }
                clippedGeometry.geometry = e.features[0].geometry;
                if (!clippedGeometry.properties.isNew) {
                    // tourJson2.CLIPS[clippedGeometry.properties.index].CLIP_PATH = clippedGeometry.geometry;
                }
            }
        })
        map.on('draw.selectionchange', (e) => {
            if (e.points.length > 0) {
                var currentPoint = JSON.stringify(e.points[0].geometry.coordinates)
                var dFts = Draw.getAll()
                var lineCs = dFts.features[0].geometry.coordinates;
                isMiddleVertix = true;
                if (currentPoint === JSON.stringify(lineCs[0]) || currentPoint === JSON.stringify(lineCs[lineCs.length -1])) {
                    // Draw.changeMode('simple_select', { featureIds: [dFts.features[0].id] });
                    isMiddleVertix = false;
                    // alert("Starting and ending vertices are not editable");
                }
            }
        });
        // map.on('draw.selectionchange', (e) => {
        //     console.log(e);
        //     try {
        //         if(e.points[0].geometry.type === "Point") {
        //             Draw.trash();
        //         }
        //     }catch (e) {
        //
        //     }
        // })
        map.on("click", "gl-draw-polygon-and-line-vertex-halo-active.hot", (e) => {
            setTimeout(() => {
                if (isMiddleVertix) {
                    Draw.trash();
                }
            }, 200)

        });
        updateTourData(nameKey);
    });
    map.on('styleimagemissing', (e) => {
        const id = e.id;
        if (map.hasImage(id)){
            return;
        }
        map.loadImage("/favicon.ico", (error, image) => {
            if (error) throw error;
            if (!map.hasImage(id)){
                map.addImage(id, image);
            }
        });
    });
}
var isMiddleVertix = false;
function openImage(url) {
    $('#large-image').addClass('d-flex').fadeIn();
    $('#large-image img').attr("src", url);
}
function closeImage() {
    $('#large-image').removeClass('d-flex').fadeOut();
}
const updateTourData = async (nameKey) => {
    clearClipGeometry();
    convertedEnd = 0;
    convertedStart = 0;
    currentTime = 0;
    // mp3 file url
    audioFile = `${awsServer}${nameKey}.mp3`;
    wavesurfer.load(audioFile);

    tourCoordinates = await fetchTourCoordinates(nameKey);

    map.getSource("route").setData({
        type: "Feature",
        properties: {},
        geometry: {
            type: "LineString",
            coordinates: tourCoordinates,
        },
    });

    if (tourCoordinates.length > 0) {
        if (marker === null) {
            marker = new mapboxgl.Marker().setLngLat(tourCoordinates[0]).addTo(map);
        } else {
            marker.setLngLat(tourCoordinates[0]);
        }
        const line = turf.lineString(tourCoordinates);
        const bbox = turf.bbox(line);
        map.fitBounds(bbox, {padding: 40, bearing: 0, pitch: 0, duration: 5000});
    }


    tourJson2 = await fetchTourJson2(nameKey);
    if (tourJson2.CLIPS == null) {
        tourJson2.CLIPS = []
    }
    checkLogin();
    document.querySelector('#gallery-modal-body-new-photos').innerHTML = "";
    for (let i = 0; i < tourJson2.PHOTOS.length; i++) {
        if (tourJson2.PHOTOS[i].FILE != null){
            let div = document.createElement('div');
            let fileName = tourJson2.PHOTOS[i].FILE.slice(0, -4);
            div.innerHTML = `
                    <img class="m-2 p-1 border rounded-lg gallery-photos-selected" onclick="imageSelectedSelected('${fileName}', '${awsServer}${tourJson2.PHOTOS[i].FILE}')" id="gallery-photo-id-selected-${fileName}"  src="${awsServer}${tourJson2.PHOTOS[i].FILE}" alt="Image" width="250" height="250">
                `;
            document.querySelector('#gallery-modal-body-new-photos').appendChild(div);
        }
    }

    // console.log(tourJson2);

    photoMarkers.forEach((item) => {
        item.remove();
    });
    photoMarkers = [];
    map.getStyle().layers.forEach((lyr) => {
        if (lyr.id.indexOf("photo-marker-") !== -1) {
            map.removeLayer(lyr.id);
        }
    })
    if (tourJson2.PHOTOS && tourJson2.PHOTOS.length > 0) {
        // var photoGeojson = {
        //     "type": "FeatureCollection",
        //     "features": [
        //     ]
        // }
        // photoGeojson.features = tourJson2.PHOTOS.map((pt) => {
        //     return {
        //         "type": "Feature",
        //         "properties": {
        //             'url': pt.FILE
        //         },
        //         "geometry": {
        //             "type": "Point",
        //             "coordinates": [
        //                 Number(pt.COORDINATES.LONG),
        //                 Number(pt.COORDINATES.LAT)
        //             ]
        //         }
        //     }
        // });
        // console.log(photoGeojson);
        // return;
        // map.getSource("route-photos").setData(photoGeojson);
        // tourJson2.PHOTOS.forEach((pt, index) => {
        //     map.addLayer({
        //         'id': 'photo-marker-'+nameKey+"-"+index,
        //         'type': 'symbol',
        //         'source': 'route-photos',
        //         'layout': {
        //             'icon-image': ['get', 'url'],
        //             'icon-size': 0.1
        //         }
        //     });
        // });
        tourJson2.PHOTOS.forEach((item) => {
            const lng = item.COORDINATES.LONG;
            const lat = item.COORDINATES.LAT;

            const el = document.createElement("div");

            el.className = "photoMarker";
            el.style.backgroundImage = `url(${imgServer}${item.FILE})`;
            el.onclick = () => {
                openImage(`${awsServer}${item.FILE}`)
            }

            const photoMarker = new mapboxgl.Marker(el)
                .setLngLat([lng, lat])
                .addTo(map);
            photoMarkers.push(photoMarker);
        });

    }

    showJson2Form(tourJson2);

    document.getElementById("noOfPoint").innerHTML = tourCoordinates.length;
};

const showJson2Form = (json2) => {
    emptyForm();

    document.getElementById("name").value = "";
    document.getElementById("guidename").value = "";
    document.getElementById("photographername").value = "";
    document.getElementById("mainphoto").src = "#";
    document.getElementById("languageSelect").selectedIndex = 0;
    document.getElementById("clip_edit").innerHTML = "";

    if (json2) {
        document.getElementById("name").value =
            json2.METADATA?.TOUR_NAME.trim() || "";
        document.getElementById("guidename").value =
            json2.METADATA?.GUIDE_NAME || "";
        document.getElementById("photographername").value =
            json2.METADATA?.PHOTOG_NAME || "";

        for (
            var i = 0, j = document.getElementById("languageSelect").options.length;
            i < j;
            ++i
        ) {
            if (
                document.getElementById("languageSelect").options[i].value ===
                json2.METADATA?.LANGUAGE_ID
            ) {
                document.getElementById("languageSelect").selectedIndex = i;
                break;
            }
        }

        if (json2.METADATA?.MAIN_PHOTO != null) {
            document.getElementById(
                "mainphoto"
            ).src = `${imgServer}${json2.METADATA?.MAIN_PHOTO}`;
            document.getElementById("mainphoto").style.display = "inline";
        } else if (json2.PHOTOS?.length > 0) {
            document.getElementById(
                "mainphoto"
            ).src = `${imgServer}${json2.PHOTOS[0].FILE}`;
            document.getElementById("mainphoto").style.display = "inline";
        } else {
            // document.getElementById("mainphoto").style.display = "none";
        }

        if (json2.CLIPS != null) {
            //var allClips = data.CLIPS;
            //tourClips = allClips.CLIP;
            //document.getElementById('clip_edit').innerHTML =(allClips.CLIP.CLIP_NAME);
            success({items: json2.CLIPS});
        }
    }
};

const emptyForm = () => {
    document.getElementById("clip_name").value = "";
    document.getElementById("transcriptios").value = "";
    document.getElementById("startdate").value = "";
    document.getElementById("enddate").value = "";
    document.getElementById("clip_image").src = "css/gallery.png";
};

const editform = async () => {
    document.getElementById("clip_name").value = tourClips.CLIP_NAME;
    document.getElementById("transcriptios").value = tourClips.TRANSCRIPTION;
    document.getElementById("startdate").value = covert_time(tourClips.START);
    document.getElementById("enddate").value = covert_time(tourClips.END);
    document.getElementById("clip_image").src = imgServer + tourClips.CLIP_PHOTO;
};

const covert_time = (time) => {
    // console.log(time, "time");
    const sec = time;
    let hours = Math.floor(sec / 3600);
    // console.log(hours, "hours");
    let minutes = Math.floor((sec - hours * 3600) / 60);
    // console.log(minutes, "minutes");
    let seconds = sec - hours * 3600 - minutes * 60;
    // console.log(seconds, "seconds");
    if (hours < 10) {
        hours = "0" + hours;
    }
    if (minutes < 10) {
        minutes = "0" + minutes;
    }
    if (seconds < 10) {
        seconds = "0" + seconds;
    }
    var re_time = hours + ":" + minutes + ":" + seconds;
    // console.log(re_time, "return time");
    return re_time;
};

async function fetchTours() {
    const response = await fetch(`${apiServer}?tour=${nameKey}`, {method: "GET", credentials: "include", cache: "no-cache"});
    if (response.ok) {
        const json = await response.json();
        return json.files;
    } else {
        console.log(response.status);
        return [];
    }
}

async function fetchLanguages() {
    const response = await fetch(`${langServer}`, {method: "GET",cache: "no-cache"});
    if (response.ok) {
        const json = await response.json();
        return json.results;
    } else {
        console.log(response.status);
        return [];
    }
}

async function fetchTourCoordinates(nameKey) {
    const response = await fetch(`${awsServer}${nameKey}.json`,{cache: "no-cache"});
    if (response.ok) {
        const json = await response.json();
        const features = json.features;
        // console.log(features, "json features");
        const lineCoordinates = [];
        features.forEach((feature) => {
            const coords = feature.geometry.coordinates;
            lineCoordinates.push(coords);
        });
        return lineCoordinates;
    } else {
        if (response.status === 404) {
            alert("Tour's tracking not found");
        }
        return [];
    }
}

async function fetchTourJson2(nameKey) {
    const response = await fetch(`${awsServer}${nameKey}.json2`, {cache: "no-cache"});
    if (response.ok) {
        const json = await response.json();
        if (json.METADATA.TOUR_NAME.trim().length > 0){
            $('#tourSelect option:selected').text(json.METADATA.TOUR_NAME);
            tourNames[nameKey] = json.METADATA.TOUR_NAME;
            setCookie("tour_names", JSON.stringify(tourNames), 10);
        }
        var isTourHasNewTxt = false;
        if(json.CLIPS !== null){
	  for (let i = 0; i < json.CLIPS.length; i++) {
            if (json.CLIPS[i].CLIP_FILE.indexOf(".mp3") !== -1){
                if (json.CLIPS[i].TRANSCRIPTION === ""){
                    var transcription = await fetchClipTranscription(json.CLIPS[i].CLIP_FILE + ".txt");
                    try {
                        transcription = transcription.results.transcripts.map(tr => tr.transcript);
                        json.CLIPS[i].TRANSCRIPTION = transcription.join("<br>");
                        isTourHasNewTxt = true;
                    }catch (e) {

                    }
                }
	    } 
	  }
        }
        if (isTourHasNewTxt){
            tourJson2 = json;
            saveChanges(false);
        }
        return json;
    } else {
        console.log(response.status);
        if (response.status === 404){
            return {
                "METADATA": {
                    "TOUR_NAME": "",
                    "GUIDE_NAME": "",
                    "GUIDE_ORG": "",
                    "GUIDE_ETHWALLET": "",
                    "PHOTOG_NAME": "",
                    "MAIN_PHOTO": null,
                    "USER_ETHWALLET": "",
                    "USER_EMAIL": "",
                    "LOCATION": {
                        "PLACE": "", "CITY": "", "COUNTRY": ""
                    },
                    "language": "English",
                    "LANGUAGE_ID": "1"
                },
                "CLIPS": [],
                "PHOTOS": []
            };
        }
        return null;
    }
}

var success = function () {
    $("#clipsAccordion").empty();
    tourJson2.CLIPS.forEach(function (item, index) {
        var template = '<div class="accordion-item">';
        template += '<h2 class="accordion-header" id="header' + index + '">';
        // template += '<h4 class="panel-title">';
        template +=
            '<button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse' + index +
            '" aria-expanded="false" aria-controls="collapse' + index + '" id="accordion' + index + '"> ' +
            item.CLIP_NAME +
            "</button></h2>";
        template +=
            '<div id="collapse' + index + '" class="accordion-collapse collapse" aria-labelledby="header' + index + '" data-bs-parent="#clipsAccordion">  ';

        // Name of Clip
        var clipSrc = 'css/gallery.png';
        if (item.CLIP_PHOTO !== ''){
            if (newClipPhotos.hasOwnProperty(item.CLIP_PHOTO)){
                clipSrc = newClipPhotos[item.CLIP_PHOTO];
            } else {
                clipSrc = imgServer + item.CLIP_PHOTO;
            }
        }
        template +=
            '<div class="accordion-body p-0"><div class="form-group input-material row" style="margin-left: 2%"><input value="' +
            item.CLIP_NAME +
            '" id="clip_name' +
            index +
            '" type="text" required onkeyup="document.getElementById(`accordion' + index + '`).textContent = this.value;" /> <img src="'+clipSrc+'" onclick="openGalleryForID(this.id)" class="clippedImage" id="clip_image' +
            index +
            '" />';
        // template += '<div style="margin-bottom: 0.1rem" class="col-6"> <span style="color: #0095fc">Name of Clip</span> </div>';
        template += "</div>";

        // Start and End Date
        template +=
            '<div class="timeblock" style="display: flex; margin-left: 0.5rem; margin-bottom: 0.2rem">';
        template +=
            '<button onclick="setClipTime(true)" class="setClipTime-left"> { </button> <input value="' +
            covert_time(item.START) +
            '" class="rounded start_time" id="startdate' +
            index +
            '"  onkeyup="onStartChange()"   placeholder="00:00:00" />';

        template +=
            ' <input onkeyup="onEndChange()" value="' +
            covert_time(item.END) +
            '" class="rounded end_time" id="enddate' +
            index +
            '" placeholder="00:00:00"/>';
        template +=
            '<button onclick="setClipTime(false)" class="setClipTime-right">}</button>';
        template += "</div>";

        // Transcription
        template +=
            '<div class="form-group"  style="margin-left: 3%; margin-bottom: 0.5rem">';
        template +=
            '<textarea id="clip-transcription-'+index+'" class="form-control transcript"></textarea>';
        var isForReview = item.IS_FOR_REVIEW ? 'checked':''
        template += "</div>" +
            '            <div' +
            '                    style="display: flex; margin-left: 0.5rem; margin-bottom: 0.2rem"' +
            '            >' +
            '                <div>' +
            '                    <button href="'+index+'"' +
            '                            onclick="postClip(true)"' +
            '                            class="btn btn-primary"' +
            '                            style="' +
            '                  width: 3rem;' +
            '                  padding: 2%;' +
            '                  color: #fff;' +
            '                  background-color: #0095fc;' +
            '                  text-transform: uppercase;' +
            '                  outline: 0;' +
            '                  border-style: none;' +
            '                  cursor: pointer;' +
            '                "' +
            '                    >' +
            '                        Clip' +
            '                    </button>' +
            '                </div>' +
            '                <div style="margin-left: 1rem;margin-top: 5px;">' +
            '                    <label class="switch">' +
            '                        <input onchange="smoothLineFunction(this.checked)" type="checkbox"/>' +
            '                        <span class="slider round"></span' +
            '                        ></label>' +
            '                </div>' +
            '                <div style="margin-left: 1rem">smooth line</div>' +
            '            </div>' +
            '            <div' +
            '                    style="display: flex; margin-left: 0.5rem; margin-bottom: 0.5rem"' +
            '            >' +
            '                <div>' +
            '                    <button onclick="saveClipByIndex()"' +
            '                            type="submit"' +
            '                            class="btn btn-primary saveClip"' +
            '                    >' +
            '                        SAVE' +
            '                    </button>' +
            '                </div>' +
            '                <div style="margin-left: 1rem;margin-top: 5px;">' +
            '                    <label class="switch">' +
            '                        <input '+isForReview+'  id="review-check'+index+'" type="checkbox"/> <span class="slider round"></span' +
            '                    ></label>' +
            '                </div>' +
            '                <div style="margin-left: 1rem">request review</div>' +
            '            </div>';

        template += "</div></div></div>";

        $("#clipsAccordion").append(template);
    });
};

function openGalleryForID(id) {
    selectedGalleryImages.img_id = id;
    document.querySelector('#gallery-modal-open-button').click();
}

// success(data);
document.getElementById("clip_image").addEventListener('click', function () {
    //if (clippedGeometry.geometry.coordinates.length === 0) {
    //    alert("Clip geometry is not ready. Click on the clip button.");
    //    return;
    //}
    openGalleryForID("clip_image");
})

function imageSelected(id, src) {
    for (let i = 0; i < document.querySelectorAll('.gallery-photos').length; i++) {
        document.querySelectorAll('.gallery-photos')[i].classList.remove('bg-primary');
    }
    selectedGalleryImages.image_type = 'new';
    selectedGalleryImages.src = src;
    document.querySelector(`#gallery-photo-id-${id}`).classList.add('bg-primary');
}

function imageSelectedSelected(id, src) {
    for (let i = 0; i < document.querySelectorAll('.gallery-photos-selected').length; i++) {
        document.querySelectorAll('.gallery-photos-selected')[i].classList.remove('bg-primary');
    }
    selectedGalleryImages.image_type = 'old';
    selectedGalleryImages.src = src;
    document.querySelector(`#gallery-photo-id-selected-${id}`).classList.add('bg-primary');
}

function showNewImages() {
    var latLong = [0,0];
    if (selectedGalleryImages.img_id.indexOf('clip_image') !== -1 && clippedGeometry.geometry.coordinates[0] !== undefined) {
        latLong = clippedGeometry.geometry.coordinates[0];
    } else {
        latLong = tourCoordinates[convert_time_to_seconds($('#runAudioTime').text())]
    }

    fetch(`https://www.flickr.com/services/rest/?method=flickr.photos.search&lat=${latLong[1]}&lon=${latLong[0]}&radius=1&api_key=8759b9a7f8a974bc21a89e46ed527a90`)
        .then(response => response.text())
        .then((data) => {
            let div = document.createElement('div');
            div.innerHTML = data;
            let photos = div.querySelectorAll('photo')
            document.querySelector('#gallery-loader').setAttribute('style', 'display:none');
            document.querySelector('#gallery-modal-body').innerHTML = "";
            for (let i = 0; i < photos.length; i++) {
                let div = document.createElement('div');
                div.innerHTML = `
                    <img class="m-2 p-1 border rounded-lg gallery-photos" onclick="imageSelected(${photos[i].id}, 'https://live.staticflickr.com/${photos[i].getAttribute('server')}/${photos[i].getAttribute('id')}_${photos[i].getAttribute('secret')}.jpg')" id="gallery-photo-id-${photos[i].id}" src="https://live.staticflickr.com/${photos[i].getAttribute('server')}/${photos[i].getAttribute('id')}_${photos[i].getAttribute('secret')}.jpg" alt="Image" width="250" height="250">
                `;
                document.querySelector('#gallery-modal-body').appendChild(div);
            }
        });
}

function showSelectedValue() {
    document.getElementById(selectedGalleryImages.img_id).setAttribute('src', selectedGalleryImages.src);
    var srcSpl = selectedGalleryImages.src.split('/');
    var filename = srcSpl[srcSpl.length - 1];
    if (selectedGalleryImages.img_id === 'mainphoto') {
        tourJson2.METADATA.MAIN_PHOTO = filename;
        if (selectedGalleryImages.image_type === 'new') {
            let latLong = tourCoordinates[convert_time_to_seconds($('#runAudioTime').text())];
            newClipPhotos[filename] = selectedGalleryImages.src;
            tourJson2.PHOTOS.push({
                COORDINATES:{
                    ELEV: 0,
                    HEADING: 0,
                    LAT: latLong[1],
                    LONG: latLong[0]
                },
                FILE: tourJson2.METADATA.MAIN_PHOTO,
                TIMESTAMP: "0"
            });
        }
    } else if (selectedGalleryImages.img_id !== 'clip_image') {
        var ind = Number(selectedGalleryImages.img_id.replace('clip_image',''))
        tourJson2.CLIPS[ind].CLIP_PHOTO = filename;
        if (selectedGalleryImages.image_type === 'new') {
            let latLong = clippedGeometry.geometry.coordinates[0];
            newClipPhotos[filename] = selectedGalleryImages.src;
            tourJson2.PHOTOS.push({
                COORDINATES:{
                    ELEV: 0,
                    HEADING: 0,
                    LAT: latLong[1],
                    LONG: latLong[0]
                },
                FILE: filename,
                TIMESTAMP: "0"
            });
        }
    }
    $('#gallery-modal').modal('hide');
}
