var size = 360;
var polarSize = Math.floor(size * Math.PI);
var defaultColor = 'white';
var cropTopBottom = [.25, .25];
var fillBottom = (-.25 + 1 - cropTopBottom.reduce(function (a, b) {return a + b;}));

window.addEventListener('load', onLoad);

function onLoad() {
    document.getElementsByTagName('img')[0].width = polarSize;
    var canvas = document.getElementsByTagName('canvas')[1];
    var ctx = canvas.getContext('2d');
    var img = new Image();

    img.onload = function (e) {
        onLoadImage(e.target, canvas, ctx);
    };

    img.src = './R0010025.png';
}

function setCanvasSize(canvas, width, height) {
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
}

function crop(canvas, position, size, isPercent) {
    if (['left', 'right', 'bottom', 'top'].indexOf(position) === -1) {
        throw new Error('Unexpected position');
    }
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = "white";
    ctx.fillRect(
        position != 'right' ? 0 : !isPercent ? size : Math.ceil(canvas.width * (1 - size)),
        position != 'bottom' ? 0 : !isPercent ? size : Math.ceil(canvas.height * (1 - size)),
        ['right', 'left'].indexOf(position) == -1 ? canvas.width : !isPercent ? size : canvas.width * size,
        ['top', 'bottom'].indexOf(position) == -1 ? canvas.height : !isPercent ? size : canvas.height * size
    );
}

function onLoadImage(img, canvas, ctx) {
    var cropHeight = cropTopBottom.reduce(function(a,b){return a+b;});
    var aspectRatio = img.width / img.height;
    var scaledImgSize = {
        width: polarSize,
        height: polarSize / aspectRatio * (1 - cropHeight + fillBottom)
    };
    var offsetTop = img.width * cropTopBottom[0] / aspectRatio;
    setCanvasSize(canvas, scaledImgSize.width, scaledImgSize.height);
    ctx.drawImage(img,
        0, offsetTop, img.width, img.height * (1 - cropHeight),
        0, 0, scaledImgSize.width, scaledImgSize.width / aspectRatio * (1 - cropHeight));
    // crop(canvas, 'bottom', fillBottom, true);

    var bagel = document.getElementsByTagName('canvas')[0];
    bagel.width = size;
    bagel.height = size;
    var ctxBagel = bagel.getContext('2d');
    ctxBagel.fillStyle = defaultColor;
    ctxBagel.fillRect(0, 0, bagel.width, bagel.height);
    var bagelData = ctxBagel.getImageData(0, 0, bagel.width, bagel.height);
    var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    var rowWidth = canvas.width * 4;
    var rowWidthBagel = bagel.width * 4;

    var halfWidth = canvas.width / 2;
    var halfWidthBagel = size / 2;

    var i, j, angle, distance, x, y, bagelIndex, imageIndex;
    var dd, alpha = 1;
    for (i = 0; i < bagel.height; i++) {
        for (j = 0; j < bagel.width; j++) {
            distance = getDistance(j + 1, i + 1, halfWidthBagel, halfWidthBagel);
            dd = halfWidthBagel - distance;
            if (dd >= 0) {
                alpha = (dd < 1) ? dd : 1;

                angle = prepareAngle(Math.atan2(halfWidthBagel - (i), halfWidthBagel - j));
                x = Math.floor((1 + angle / Math.PI) * halfWidth);
                y = (Math.ceil(canvas.height - distance / halfWidthBagel * canvas.height));

                bagelIndex = i * rowWidthBagel + j * 4;
                imageIndex = (y) * rowWidth + x * 4;

                bagelData.data[bagelIndex] = imageData.data[imageIndex];
                bagelData.data[bagelIndex + 1] = imageData.data[imageIndex + 1];
                bagelData.data[bagelIndex + 2] = imageData.data[imageIndex + 2];
                bagelData.data[bagelIndex + 3] = Math.ceil(imageData.data[imageIndex + 3] * alpha);
            }
        }
    }
    ctxBagel.putImageData(bagelData, 0, 0);

    // for (i = 0; i < canvas.height; i++) {
    //     for (j = 0; j < canvas.width; j++) {
    //         angle = (halfWidth - j) * angleRatio;
    //         distance = (canvas.height - i) * distanceRatio / 2;
    //         x = Math.floor(halfWidthBagel + Math.cos(angle) * distance);
    //         y = Math.floor(halfWidthBagel + Math.sin(angle) * distance);
    //
    //         bagelIndex = y * rowWidthBagel + x * 4;
    //         imageIndex = i * rowWidth + j * 4;
    //
    //         bagelData.data[bagelIndex] = imageData.data[imageIndex];
    //         bagelData.data[bagelIndex + 1] = imageData.data[imageIndex + 1];
    //         bagelData.data[bagelIndex + 2] = imageData.data[imageIndex + 2];
    //         bagelData.data[bagelIndex + 3] = imageData.data[imageIndex + 3];
    //     }
    // }
    //

}

var coefPI = Math.PI / 2;

function prepareAngle(angle) {
    var res = angle - coefPI;
    if (res < -Math.PI) {
        return 2 * Math.PI + res;
    }
    return res;
}

function getDistance(x1, y1, x2, y2) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    return Math.pow(dx * dx + dy * dy, .5);
}