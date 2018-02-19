const VERT = '\
#version 300 es\n\
\n\
precision mediump float;\n\
\n\
in vec2 a_pos;\n\
in vec2 a_tex_pos;\n\
\n\
out vec2 v_tex_pos;\n\
\n\
void main() {\n\
        v_tex_pos = a_tex_pos;\n\
        gl_Position = vec4(a_pos, 0, 1);\n\
}\n\
';

const FRAG = '\
#version 300 es\n\
\n\
precision mediump float;\n\
\n\
uniform sampler2D u_texture;\n\
const float IDENTITY[9] = float[9](0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0);\n\
const float TOP_SOBEL[9] = float[9](-1.0, -2.0, -1.0, 0.0, 0.0, 0.0, 1.0, 2.0, 1.0);\n\
const float LEFT_SOBEL[9] = float[9](-1.0, 0.0, 1.0, -2.0, 0.0, 2.0, -1.0, 0.0, 1.0);\n\
\n\
in vec2 v_tex_pos;\n\
\n\
out vec4 frag_color;\n\
\n\
vec3 preprocess(vec3 color) {\n\
        return vec3((0.2126 * color.r) + (0.7152 * color.g) + (0.0722 * color.b));\n\
}\n\
\n\
vec3 convolve(float kernel[9]) {\n\
        return abs(\n\
                (kernel[0] * preprocess(textureOffset(u_texture, v_tex_pos, ivec2(-1, -1)).rgb)) +\n\
                (kernel[1] * preprocess(textureOffset(u_texture, v_tex_pos, ivec2( 0, -1)).rgb)) +\n\
                (kernel[2] * preprocess(textureOffset(u_texture, v_tex_pos, ivec2( 1, -1)).rgb)) +\n\
                (kernel[3] * preprocess(textureOffset(u_texture, v_tex_pos, ivec2(-1,  0)).rgb)) +\n\
                (kernel[4] * preprocess(textureOffset(u_texture, v_tex_pos, ivec2( 0,  0)).rgb)) +\n\
                (kernel[5] * preprocess(textureOffset(u_texture, v_tex_pos, ivec2( 1,  0)).rgb)) +\n\
                (kernel[6] * preprocess(textureOffset(u_texture, v_tex_pos, ivec2(-1,  1)).rgb)) +\n\
                (kernel[7] * preprocess(textureOffset(u_texture, v_tex_pos, ivec2( 0,  1)).rgb)) +\n\
                (kernel[8] * preprocess(textureOffset(u_texture, v_tex_pos, ivec2( 1,  1)).rgb)));\n\
}\n\
\n\
void main() {\n\
//        frag_color = texture(u_texture, v_tex_pos);\n\
//        vec3 color = texture(u_texture, v_tex_pos).rgb;\n\
        vec3 outline = vec3(1.0) - (convolve(TOP_SOBEL) + convolve(LEFT_SOBEL));\n\
        frag_color = vec4(outline, 1.0);\n\
}\n\
';

const canvas = document.getElementById('canvas');
const gl = canvas.getContext('webgl2');
var camera;

var shaderProgram;
var texture;
var quadVAO;

if (gl) {
        camera = document.createElement('video')
        if (navigator.mediaDevices.getUserMedia) {
                navigator.mediaDevices.getUserMedia({video: true}).then(camSuccess).catch(camFailure);
                shaderProgram = createProgram(gl, VERT, FRAG);
                texture = initTexture(gl);
                quadVAO = initQuadVAO(gl);
                gl.viewport(0, 0, canvas.width, canvas.height);
                requestAnimationFrame(render);
        } else {
                alert("Requires Firefox");
        }
} else {
        alert("WebGL2 Not Supported");
}

function camSuccess(stream) {
        camera.src = window.URL.createObjectURL(stream);
        camera.play();
}

function camFailure(error) {
        alert(JSON.stringify(error));
}

function render() {
        updateTexture(gl, texture, camera);
        gl.useProgram(shaderProgram.programID);
        const textureUnit = 0;
        bindTexture(gl, texture, textureUnit);
        gl.uniform1i(shaderProgram.u_texture, textureUnit);
        gl.bindVertexArray(quadVAO);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        requestAnimationFrame(render);
}

function initTexture(gl) {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE,
                      new Uint8Array([0, 0, 255, 255]));
//        const standbyImg = new Image();
//        standbyImg.src = 'standby.jpg';
//        console.log('standbyImg', standbyImg);
//        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, standbyImg.width, standbyImg.height,
//                      0, gl.RGB, gl.UNSIGNED_BYTE, standbyImg);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        return texture;
}

function updateTexture(gl, texture, video) {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
}

function initQuadVAO(gl) {
        quadPosBuffer = createBuffer(gl, new Float32Array(
                [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]));
        quadTexPosBuffer = createBuffer(gl, new Float32Array(
                [0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0]));
        quadVAO = gl.createVertexArray();
        gl.bindVertexArray(this.quadVAO);
        bindAttribute(gl, quadPosBuffer, shaderProgram.a_pos, 2);
        bindAttribute(gl, quadTexPosBuffer, shaderProgram.a_tex_pos, 2);
        gl.bindVertexArray(null);
        return quadVAO;
}

// https://github.com/mapbox/webgl-wind

function createShader(gl, type, source) {
        var shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                throw new Error(gl.getShaderInfoLog(shader));
        }
        
        return shader;
}

function createProgram(gl, vertexSource, fragmentSource) {
        var program = gl.createProgram();
        
        var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
        var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
        
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                throw new Error(gl.getProgramInfoLog(program));
        }
        
        var wrapper = {programID: program};
        
        var numAttributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
        for (var i = 0; i < numAttributes; i++) {
                var attribute = gl.getActiveAttrib(program, i);
                wrapper[attribute.name] = gl.getAttribLocation(program, attribute.name);
        }
        var numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        for (var i$1 = 0; i$1 < numUniforms; i$1++) {
                var uniform = gl.getActiveUniform(program, i$1);
                wrapper[uniform.name] = gl.getUniformLocation(program, uniform.name);
        }
        
        return wrapper;
}

function bindTexture(gl, texture, unit) {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, texture);
}

function createBuffer(gl, data) {
        var buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        return buffer;
}

function bindAttribute(gl, buffer, attribute, numComponents) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.enableVertexAttribArray(attribute);
        gl.vertexAttribPointer(attribute, numComponents, gl.FLOAT, false, 0, 0);
}
