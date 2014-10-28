(function (global) {

    "use strict";

    function pad(str, length) {
        while (str.length < length) {
            str = '0' + str;
        }
        return str;
    };

    var getRandomInt = fabric.util.getRandomInt;
    function getRandomColor() {
        return (
      pad(getRandomInt(0, 255).toString(16), 2) +
      pad(getRandomInt(0, 255).toString(16), 2) +
      pad(getRandomInt(0, 255).toString(16), 2)
    );
    }

    function getRandomNum(min, max) {
        return Math.random() * (max - min) + min;
    }

    if (/(iPhone|iPod|iPad)/i.test(navigator.userAgent)) {
        fabric.Object.prototype.cornersize = 30;
    }

    var canvas = global.canvas = new fabric.Canvas('comicedit');

    canvas.backgroundColor = "white";
    canvas.renderAll();

    // canvas.controlsAboveOverlay = true;

    $("#addimage").click(function () {

        var img = $("#onlinefileselector").val();
        if (img == '' || img.charAt(0) == '<')
            return false;

        var data = new FormData();
        data.append('imgurl', img);

        $.ajax({
            url: '/comic/addimage/',
            contentType: false,
            processData: false,
            data: data,
            type: 'POST',
            success: function (data, textStatus, jqXHR) {
                fabric.Image.fromURL(data, function (image) {
                    image.set({
                        left: 150,
                        top: 150
                    });
                    canvas.add(image);
                });
            },
            error: function (XMLHttpRequest, textStatus, errorThrown) {
                $("#msgbox").html("error !!! could not load image");
            }
        });
    });

    document.getElementById('commands').onclick = function (ev) {
        ev = ev || window.event;

        if (ev.preventDefault) {
            ev.preventDefault()
        }
        else if (ev.returnValue) {
            ev.returnValue = false;
        }

        var element = ev.target || ev.srcElement;
        if (element.nodeName.toLowerCase() === 'strong') {
            element = element.parentNode;
        }

        var className = element.className,
        offset = 50,
        left = fabric.util.getRandomInt(0 + offset, 500 - offset),
        top = fabric.util.getRandomInt(0 + offset, 500 - offset),
        angle = 0,
        width = fabric.util.getRandomInt(30, 50),
        opacity = (function (min, max) { return Math.random() * (max - min) + min; })(0.5, 1);

        switch (className) {
            case 'rect':
                canvas.add(new fabric.Rect({
                    left: left,
                    top: top,
                    width: 50,
                    height: 50,
                    opacity: 1,
                    strokeWidth: 1,
                    stroke: '#0000',
                    fill: '#FFFF'
                }));
                break;

            case 'circle':
                canvas.add(new fabric.Circle({
                    left: left,
                    top: top,
                    strokeWidth: 1,
                    stroke: '#0000',
                    fill: '#FFFF',
                    radius: 50,
                    opacity: 1
                }));
                break;

            case 'triangle':
                canvas.add(new fabric.Triangle({
                    left: left,
                    top: top,
                    strokeWidth: 1,
                    stroke: '#0000',
                    fill: '#FFFF',
                    width: 50,
                    height: 50,
                    opacity: 1
                }));
                break;
        }

        if ($(element).hasClass('clear')) {
            if (confirm('Are you sure?')) {
                canvas.clear();
            }
        }
    };

    document.getElementById('rasterize').onclick = function () {
        if (!fabric.Canvas.supports('toDataURL')) {
            alert('This browser doesn\'t provide means to serialize canvas to an image');
        }
        else {

            var imgtags = $("#tags").val();

            if (imgtags == '') {
                $("#msgbox").html("adds some tags before saving your comic !!!");
                return false;
            }

            var data = new FormData();
            data.append('img', canvas.toDataURL('image/jpeg'));
            data.append('tags', imgtags);

            $.ajax({
                url: '/comic/create',
                contentType: false,
                processData: false,
                data: data,
                type: 'POST',
                success: function (data, textStatus, jqXHR) {
                    window.location = "/comic/index/" + data.id;
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    $("#msgbox").html("error !!! please try again");
                }
            });
        }
    };

    var removeSelectedEl = document.getElementById('remove-selected');
    removeSelectedEl.onclick = function () {
        var activeObject = canvas.getActiveObject(),
        activeGroup = canvas.getActiveGroup();
        if (activeObject) {
            canvas.remove(activeObject);
        }
        else if (activeGroup) {
            var objectsInGroup = activeGroup.getObjects();
            canvas.discardActiveGroup();
            objectsInGroup.forEach(function (object) {
                canvas.remove(object);
            });
        }
    };

    var supportsInputOfType = function (type) {
        return function () {
            var el = document.createElement('input');
            try {
                el.type = type;
            }
            catch (err) { }
            return el.type === type;
        };
    };

    var supportsSlider = supportsInputOfType('range'),
      supportsColorpicker = supportsInputOfType('color');

    if (supportsColorpicker()) {
        (function () {
            var controls = document.getElementById('controls');

            var label = document.createElement('label');
            label.htmlFor = 'color';
            label.innerHTML = 'Object Color';
            label.className = 'sidebyside';

            var colorpicker = document.createElement('input');
            colorpicker.type = 'color';
            colorpicker.id = 'color';
            colorpicker.className = 'sidebyside';

            var colortext = document.createElement('span');
            colortext.innerHTML = 'Change color of the selected element';

            controls.appendChild(colortext);
            controls.appendChild(label);
            controls.appendChild(colorpicker);

            canvas.calcOffset();

            colorpicker.onchange = function () {
                var activeObject = canvas.getActiveObject(),
            activeGroup = canvas.getActiveGroup();

                if (activeObject || activeGroup) {
                    (activeObject || activeGroup).setFill(this.value);
                    canvas.renderAll();
                }
            };
        })();
    }

    var activeObjectButtons = [
    removeSelectedEl
  ];

    var opacityEl = document.getElementById('opacity');
    if (opacityEl) {
        activeObjectButtons.push(opacityEl);
    }
    var colorEl = document.getElementById('color');
    if (colorEl) {
        activeObjectButtons.push(colorEl);
    }

    for (var i = activeObjectButtons.length; i--; ) {
        activeObjectButtons[i].disabled = true;
    }

    canvas.on('object:selected', onObjectSelected);
    canvas.on('group:selected', onObjectSelected);

    function onObjectSelected(e) {
        var selectedObject = e.target;

        for (var i = activeObjectButtons.length; i--; ) {
            activeObjectButtons[i].disabled = false;
        }

    }

    canvas.on('selection:cleared', function (e) {
        for (var i = activeObjectButtons.length; i--; ) {
            activeObjectButtons[i].disabled = true;
        }
    });

    var drawingModeEl = document.getElementById('drawing-mode'),
      drawingOptionsEl = document.getElementById('drawing-mode-options'),
      drawingColorEl = document.getElementById('drawing-color'),
      drawingLineWidthEl = document.getElementById('drawing-line-width');

    drawingModeEl.onclick = function () {
        canvas.isDrawingMode = !canvas.isDrawingMode;
        if (canvas.isDrawingMode) {
            drawingModeEl.innerHTML = 'Cancel drawing mode';
            drawingModeEl.className = 'is-drawing';
            drawingOptionsEl.style.display = '';
        }
        else {
            drawingModeEl.innerHTML = 'Enter drawing mode';
            drawingModeEl.className = '';
            drawingOptionsEl.style.display = 'none';
        }
    };

    canvas.on('path:created', function () {

    });

    drawingColorEl.onchange = function () {
        canvas.freeDrawingColor = drawingColorEl.value;
    };
    drawingLineWidthEl.onchange = function () {
        canvas.freeDrawingLineWidth = parseInt(drawingLineWidthEl.value, 10) || 1; // disallow 0, NaN, etc.
    };

    canvas.freeDrawingColor = drawingColorEl.value;
    canvas.freeDrawingLineWidth = parseInt(drawingLineWidthEl.value, 10) || 1;


    document.getElementById('add-text').onclick = function () {
        var textSample = new fabric.Text(document.getElementById('usertext').value, {
            left: 350, //getRandomInt(350, 400),
            top: 350, //getRandomInt(350, 400),
            fontFamily: 'helvetica',
            angle: 0, //getRandomInt(-10, 10),
            fill: getRandomColor(),
            scaleX: 0.5,
            scaleY: 0.5,
            fontWeight: '',
            originX: 'left',
            hasRotatingPoint: true
        });
        canvas.add(textSample);
    };

    document.onkeyup = function (e) {
        canvas.renderAll();
    };

    setTimeout(function () {
        canvas.calcOffset();
    }, 100);

    if (document.location.search.indexOf('guidelines') > -1) {
        initCenteringGuidelines(canvas);
        initAligningGuidelines(canvas);
    }

    var textEl = document.getElementById('text');
    if (textEl) {
        textEl.onfocus = function () {
            var activeObject = canvas.getActiveObject();

            if (activeObject && activeObject.type === 'text') {
                this.value = activeObject.text;
            }
        };
        textEl.onkeyup = function (e) {
            var activeObject = canvas.getActiveObject();
            if (activeObject) {
                if (!this.value) {
                    canvas.discardActiveObject();
                }
                else {
                    activeObject.setText(this.value);
                }
                console.log('rendering changed text');
                canvas.renderAll();
            }
        };
    }

    var cmdUnderlineBtn = document.getElementById('text-cmd-underline');
    if (cmdUnderlineBtn) {
        activeObjectButtons.push(cmdUnderlineBtn);
        cmdUnderlineBtn.disabled = true;
        cmdUnderlineBtn.onclick = function () {
            var activeObject = canvas.getActiveObject();
            if (activeObject && activeObject.type === 'text') {
                activeObject.textDecoration = (activeObject.textDecoration == 'underline' ? '' : 'underline');
                this.className = activeObject.textDecoration ? 'selected' : '';
                canvas.renderAll();
            }
        };
    }

    var cmdLinethroughBtn = document.getElementById('text-cmd-linethrough');
    if (cmdLinethroughBtn) {
        activeObjectButtons.push(cmdLinethroughBtn);
        cmdLinethroughBtn.disabled = true;
        cmdLinethroughBtn.onclick = function () {
            var activeObject = canvas.getActiveObject();
            if (activeObject && activeObject.type === 'text') {
                activeObject.textDecoration = (activeObject.textDecoration == 'line-through' ? '' : 'line-through');
                this.className = activeObject.textDecoration ? 'selected' : '';
                canvas.renderAll();
            }
        };
    }

    var cmdOverlineBtn = document.getElementById('text-cmd-overline');
    if (cmdOverlineBtn) {
        activeObjectButtons.push(cmdOverlineBtn);
        cmdOverlineBtn.disabled = true;
        cmdOverlineBtn.onclick = function () {
            var activeObject = canvas.getActiveObject();
            if (activeObject && activeObject.type === 'text') {
                activeObject.textDecoration = (activeObject.textDecoration == 'overline' ? '' : 'overline');
                this.className = activeObject.textDecoration ? 'selected' : '';
                canvas.renderAll();
            }
        };
    }

    var cmdBoldBtn = document.getElementById('text-cmd-bold');
    if (cmdBoldBtn) {
        activeObjectButtons.push(cmdBoldBtn);
        cmdBoldBtn.disabled = true;
        cmdBoldBtn.onclick = function () {
            var activeObject = canvas.getActiveObject();
            if (activeObject && activeObject.type === 'text') {
                activeObject.fontWeight = (activeObject.fontWeight == 'bold' ? '' : 'bold');
                this.className = activeObject.fontWeight ? 'selected' : '';
                canvas.renderAll();
            }
        };
    }

    var cmdItalicBtn = document.getElementById('text-cmd-italic');
    if (cmdItalicBtn) {
        activeObjectButtons.push(cmdItalicBtn);
        cmdItalicBtn.disabled = true;
        cmdItalicBtn.onclick = function () {
            var activeObject = canvas.getActiveObject();
            if (activeObject && activeObject.type === 'text') {
                activeObject.fontStyle = (activeObject.fontStyle == 'italic' ? '' : 'italic');
                this.className = activeObject.fontStyle ? 'selected' : '';
                canvas.renderAll();
            }
        };
    }

    var cmdShadowBtn = document.getElementById('text-cmd-shadow');
    if (cmdShadowBtn) {
        activeObjectButtons.push(cmdShadowBtn);
        cmdShadowBtn.disabled = true;
        cmdShadowBtn.onclick = function () {
            var activeObject = canvas.getActiveObject();
            if (activeObject && activeObject.type === 'text') {
                activeObject.textShadow = !activeObject.textShadow ? 'rgba(0,0,0,0.2) 2px 2px 10px' : '';
                this.className = activeObject.textShadow ? 'selected' : '';
                canvas.renderAll();
            }
        };
    }

    var textAlignSwitch = document.getElementById('text-align');
    if (textAlignSwitch) {
        activeObjectButtons.push(textAlignSwitch);
        textAlignSwitch.disabled = true;
        textAlignSwitch.onchange = function () {
            var activeObject = canvas.getActiveObject();
            if (activeObject && activeObject.type === 'text') {
                var value = this.value.toLowerCase();
                activeObject.textAlign = value;
                canvas._adjustPosition && canvas._adjustPosition(activeObject, value === 'justify' ? 'left' : value);
                canvas.renderAll();
            }
        };
    }

    var fontFamilySwitch = document.getElementById('font-family');
    if (fontFamilySwitch) {
        activeObjectButtons.push(fontFamilySwitch);
        fontFamilySwitch.disabled = true;
        fontFamilySwitch.onchange = function () {
            var activeObject = canvas.getActiveObject();
            if (activeObject && activeObject.type === 'text') {
                activeObject.fontFamily = this.value;
                canvas.renderAll();
            }
        };
    }

    var bgColorField = document.getElementById('text-bg-color');
    if (bgColorField) {
        bgColorField.onchange = function () {
            var activeObject = canvas.getActiveObject();
            if (activeObject && activeObject.type === 'text') {
                activeObject.backgroundColor = this.value;
                canvas.renderAll();
            }
        };
    }

    var bgColorField = document.getElementById('text-lines-bg-color');
    if (bgColorField) {
        bgColorField.onchange = function () {
            var activeObject = canvas.getActiveObject();
            if (activeObject && activeObject.type === 'text') {
                activeObject.textBackgroundColor = this.value;
                canvas.renderAll();
            }
        };
    }

    var strokeColorField = document.getElementById('text-stroke-color');
    if (strokeColorField) {
        strokeColorField.onchange = function () {
            var activeObject = canvas.getActiveObject();
            if (activeObject && activeObject.type === 'text') {
                activeObject.strokeStyle = this.value;
                canvas.renderAll();
            }
        };
    }

    var strokeWidthField = document.getElementById('text-stroke-width');
    if (strokeWidthField) {
        strokeWidthField.onchange = function () {
            var activeObject = canvas.getActiveObject();
            if (activeObject && activeObject.type === 'text') {
                activeObject.strokeWidth = this.value;
                canvas.renderAll();
            }
        };
    }

    if (supportsSlider) {
        (function () {
            var container = document.getElementById('text-controls');
            var slider = document.createElement('input');
            var label = document.createElement('label');
            label.innerHTML = 'Line height: ';
            try { slider.type = 'range'; } catch (err) { }
            slider.min = 0;
            slider.max = 10;
            slider.step = 0.1;
            slider.value = 1.5;

            canvas.on('object:selected', function (e) {
                slider.value = e.target.lineHeight;
            });
        })();
    }

})(this);