import * as THREE from "https://cdn.jsdelivr.net/npm/three/+esm";

export class OrbitControls extends THREE.EventDispatcher {
	constructor(object, domElement) {
		super();

		this.object = object;
		this.domElement = domElement;
		this.enabled = true;
		this.target = new THREE.Vector3();

		this.minDistance = 0;
		this.maxDistance = Infinity;

		this.minPolarAngle = 0;
		this.maxPolarAngle = Math.PI;

		this.minAzimuthAngle = -Infinity;
		this.maxAzimuthAngle = Infinity;

		this.enableZoom = true;
		this.zoomSpeed = 1.0;

		this.enableRotate = true;
		this.rotateSpeed = 1.0;

		this.enablePan = true;
		this.panSpeed = 1.0;
		this.screenSpacePanning = true;

		const STATE = { NONE: -1, ROTATE: 0, DOLLY: 1, PAN: 2, TOUCH_ROTATE: 3, TOUCH_DOLLY_PAN: 4 };
		let state = STATE.NONE;

		const scope = this;
		const spherical = new THREE.Spherical();
		const sphericalDelta = new THREE.Spherical();
		let scale = 1;
		const panOffset = new THREE.Vector3();
		let zoomChanged = false;
		const rotateStart = new THREE.Vector2();
		const rotateEnd = new THREE.Vector2();
		const rotateDelta = new THREE.Vector2();
		const panStart = new THREE.Vector2();
		const panEnd = new THREE.Vector2();
		const panDelta = new THREE.Vector2();
		const dollyStart = new THREE.Vector2();
		const dollyEnd = new THREE.Vector2();
		const dollyDelta = new THREE.Vector2();
		const EPS = 1e-6;

		function getZoomScale() {
			return Math.pow(0.95, scope.zoomSpeed);
		}

		function rotateLeft(angle) {
			sphericalDelta.theta -= angle;
		}

		function rotateUp(angle) {
			sphericalDelta.phi -= angle;
		}

		const panLeft = (() => {
			const v = new THREE.Vector3();
			return function (distance, matrix) {
				v.setFromMatrixColumn(matrix, 0).multiplyScalar(-distance);
				panOffset.add(v);
			};
		})();

		const panUp = (() => {
			const v = new THREE.Vector3();
			return function (distance, matrix) {
				if (scope.screenSpacePanning) {
					v.setFromMatrixColumn(matrix, 1);
				} else {
					v.setFromMatrixColumn(matrix, 0);
					v.crossVectors(scope.object.up, v);
				}
				v.multiplyScalar(distance);
				panOffset.add(v);
			};
		})();

		const pan = (() => {
			const offset = new THREE.Vector3();
			return function (deltaX, deltaY) {
				const element = scope.domElement;
				if (scope.object.isPerspectiveCamera) {
					const position = scope.object.position;
					offset.copy(position).sub(scope.target);
					let targetDistance = offset.length();
					targetDistance *= Math.tan((scope.object.fov / 2) * Math.PI / 180);
					panLeft((2 * deltaX * targetDistance) / element.clientHeight, scope.object.matrix);
					panUp((2 * deltaY * targetDistance) / element.clientHeight, scope.object.matrix);
				} else if (scope.object.isOrthographicCamera) {
					panLeft(deltaX * (scope.object.right - scope.object.left) / scope.object.zoom / element.clientWidth, scope.object.matrix);
					panUp(deltaY * (scope.object.top - scope.object.bottom) / scope.object.zoom / element.clientHeight, scope.object.matrix);
				}
			};
		})();

		function dollyOut(dollyScale) {
			if (scope.object.isPerspectiveCamera) {
				scale /= dollyScale;
			} else if (scope.object.isOrthographicCamera) {
				scope.object.zoom = Math.min(scope.maxDistance, scope.object.zoom * dollyScale);
				scope.object.updateProjectionMatrix();
				zoomChanged = true;
			}
		}

		function dollyIn(dollyScale) {
			if (scope.object.isPerspectiveCamera) {
				scale *= dollyScale;
			} else if (scope.object.isOrthographicCamera) {
				scope.object.zoom = Math.max(scope.minDistance, scope.object.zoom / dollyScale);
				scope.object.updateProjectionMatrix();
				zoomChanged = true;
			}
		}

		this.update = function () {
			const offset = new THREE.Vector3();
			const quat = new THREE.Quaternion().setFromUnitVectors(object.up, new THREE.Vector3(0, 1, 0));
			const quatInverse = quat.clone().invert();
			const lastPosition = new THREE.Vector3();
			const lastQuaternion = new THREE.Quaternion();
			const twoPI = 2 * Math.PI;

			return function update() {
				const position = scope.object.position;
				offset.copy(position).sub(scope.target);
				offset.applyQuaternion(quat);
				spherical.setFromVector3(offset);
				spherical.theta += sphericalDelta.theta;
				spherical.phi += sphericalDelta.phi;
				spherical.makeSafe();
				spherical.radius *= scale;
				spherical.radius = Math.max(scope.minDistance, Math.min(scope.maxDistance, spherical.radius));
				scope.target.add(panOffset);
				offset.setFromSpherical(spherical);
				offset.applyQuaternion(quatInverse);
				position.copy(scope.target).add(offset);
				scope.object.lookAt(scope.target);
				sphericalDelta.set(0, 0, 0);
				panOffset.set(0, 0, 0);
				scale = 1;
				if (zoomChanged || lastPosition.distanceToSquared(scope.object.position) > EPS || 8 * (1 - lastQuaternion.dot(scope.object.quaternion)) > EPS) {
					lastPosition.copy(scope.object.position);
					lastQuaternion.copy(scope.object.quaternion);
					zoomChanged = false;
					scope.dispatchEvent({ type: 'change' });
					return true;
				}
				return false;
			};
		}();

		// --- Mouse ---
		this.domElement.addEventListener('wheel', (event) => {
			if (!scope.enableZoom || !scope.enabled) return;
			event.preventDefault();
			if (event.deltaY < 0) dollyIn(getZoomScale());
			else dollyOut(getZoomScale());
			scope.update();
		}, {passive: false});

		this.domElement.addEventListener('mousedown', (event) => {
			event.preventDefault();
			switch (event.button) {
				case 0:
					if (!scope.enableRotate || !scope.enabled) return;
					rotateStart.set(event.clientX, event.clientY);
					state = STATE.ROTATE;
					break;
				case 1:
					if (!scope.enableZoom || !scope.enabled) return;
					dollyStart.set(event.clientX, event.clientY);
					state = STATE.DOLLY;
					break;
				case 2:
					if (!scope.enablePan || !scope.enabled) return;
					panStart.set(event.clientX, event.clientY);
					state = STATE.PAN;
					break;
			}
			document.addEventListener('mousemove', onMouseMove);
			document.addEventListener('mouseup', onMouseUp);
		});

		function onMouseMove(event) {
			event.preventDefault();
			switch (state) {
				case STATE.ROTATE:
					rotateEnd.set(event.clientX, event.clientY);
					rotateDelta.subVectors(rotateEnd, rotateStart).multiplyScalar(scope.rotateSpeed);
					rotateLeft((2 * Math.PI * rotateDelta.x) / scope.domElement.clientHeight);
					rotateUp((2 * Math.PI * rotateDelta.y) / scope.domElement.clientHeight);
					rotateStart.copy(rotateEnd);
					scope.update();
					break;
				case STATE.DOLLY:
					dollyEnd.set(event.clientX, event.clientY);
					dollyDelta.subVectors(dollyEnd, dollyStart);
					if (dollyDelta.y > 0) dollyOut(getZoomScale());
					else if (dollyDelta.y < 0) dollyIn(getZoomScale());
					dollyStart.copy(dollyEnd);
					scope.update();
					break;
				case STATE.PAN:
					panEnd.set(event.clientX, event.clientY);
					panDelta.subVectors(panEnd, panStart).multiplyScalar(scope.panSpeed);
					pan(panDelta.x, panDelta.y);
					panStart.copy(panEnd);
					scope.update();
					break;
			}
		}

		function onMouseUp() {
			document.removeEventListener('mousemove', onMouseMove);
			document.removeEventListener('mouseup', onMouseUp);
			state = STATE.NONE;
		}

		// --- Touch ---
		this.domElement.addEventListener('touchstart', onTouchStart, { passive: false });
		this.domElement.addEventListener('touchmove', onTouchMove, { passive: false });
		this.domElement.addEventListener('touchend', onTouchEnd);

		let touchStartDistance = 0;

		function onTouchStart(event) {
			event.preventDefault();
			switch (event.touches.length) {
				case 1: // Rotate
					if (!scope.enableRotate || !scope.enabled) return;
					rotateStart.set(event.touches[0].pageX, event.touches[0].pageY);
					state = STATE.TOUCH_ROTATE;
					break;
				case 2: // Dolly + pan
					if ((!scope.enableZoom && !scope.enablePan) || !scope.enabled) return;
					const dx = event.touches[0].pageX - event.touches[1].pageX;
					const dy = event.touches[0].pageY - event.touches[1].pageY;
					touchStartDistance = Math.sqrt(dx * dx + dy * dy);
					const midX = (event.touches[0].pageX + event.touches[1].pageX) / 2;
					const midY = (event.touches[0].pageY + event.touches[1].pageY) / 2;
					panStart.set(midX, midY);
					state = STATE.TOUCH_DOLLY_PAN;
					break;
			}
		}

		function onTouchMove(event) {
			event.preventDefault();
			switch (event.touches.length) {
				case 1:
					if (state !== STATE.TOUCH_ROTATE) return;
					rotateEnd.set(event.touches[0].pageX, event.touches[0].pageY);
					rotateDelta.subVectors(rotateEnd, rotateStart).multiplyScalar(scope.rotateSpeed);
					rotateLeft((2 * Math.PI * rotateDelta.x) / scope.domElement.clientHeight);
					rotateUp((2 * Math.PI * rotateDelta.y) / scope.domElement.clientHeight);
					rotateStart.copy(rotateEnd);
					scope.update();
					break;
				case 2:
					if (state !== STATE.TOUCH_DOLLY_PAN) return;
					const dx = event.touches[0].pageX - event.touches[1].pageX;
					const dy = event.touches[0].pageY - event.touches[1].pageY;
					const distance = Math.sqrt(dx * dx + dy * dy);
					if (scope.enableZoom) {
						if (distance > touchStartDistance) dollyIn(getZoomScale());
						else dollyOut(getZoomScale());
						touchStartDistance = distance;
					}
					if (scope.enablePan) {
						const midX = (event.touches[0].pageX + event.touches[1].pageX) / 2;
						const midY = (event.touches[0].pageY + event.touches[1].pageY) / 2;
						panEnd.set(midX, midY);
						panDelta.subVectors(panEnd, panStart).multiplyScalar(scope.panSpeed);
						pan(panDelta.x, panDelta.y);
						panStart.copy(panEnd);
					}
					scope.update();
					break;
			}
		}

		function onTouchEnd() {
			state = STATE.NONE;
		}
	}
}
