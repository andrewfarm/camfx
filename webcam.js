//var camera = document.getElementById('camera');
var constraints = {video:true};

function success(stream) {
        camera.src = window.URL.createObjectURL(stream);
        camera.play();
}

function failure(error) {
        alert(JSON.stringify(error));
}

if (navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia(constraints).then(success);
} else {
        alert("Try Firefox");
}
