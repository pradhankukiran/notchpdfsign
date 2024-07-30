pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const dragFileArea = document.querySelector('.drag-file-area');
const uploadIcon = document.querySelector('.upload-icon');
const dynamicMessage = document.querySelector('.dynamic-message');
const separatorText = document.querySelector('.separator');
const browseFilesText = document.querySelector('.browse-files-text');
const defaultFileInput = document.querySelector('.default-file-input');
const formContainer = document.querySelector('.form-container');
const headingContianer = document.querySelector('.heading');

const handleDragEvents = (e) => {
	e.preventDefault();
	e.stopPropagation();
};

const handleDragEnter = (e) => {
	handleDragEvents(e);
	dragFileArea.classList.add('dragover');
	uploadIcon.textContent = 'file_download';
	dynamicMessage.textContent = 'drop your pdf here!';
	separatorText.style.opacity = '0';
	browseFilesText.style.opacity = '0';
};

const handleDragLeave = (e) => {
	handleDragEvents(e);
	if (!dragFileArea.contains(e.relatedTarget)) {
		resetDragFileArea();
	}
};

const resetDragFileArea = () => {
	dragFileArea.classList.remove('dragover');
	uploadIcon.textContent = 'file_upload';
	dynamicMessage.textContent = 'drag & drop any pdf here';
	separatorText.style.opacity = '1';
	browseFilesText.style.opacity = '1';
};

dragFileArea.addEventListener('dragenter', handleDragEnter);
dragFileArea.addEventListener('dragover', handleDragEvents);
dragFileArea.addEventListener('dragleave', handleDragLeave);

dragFileArea.addEventListener('drop', (e) => {
	handleDragEvents(e);
	resetDragFileArea();
	const files = e.dataTransfer.files;
	if (files.length && files[0].type === 'application/pdf') {
		handleFileUpload(files[0]);
	}
});

defaultFileInput.addEventListener('change', (e) => {
	const files = e.target.files;
	if (files.length && files[0].type === 'application/pdf') {
		handleFileUpload(files[0]);
	}
});

function animatePDFViewer() {
	const pdfViewer = document.getElementById('pdf-viewer');
	pdfViewer.style.display = 'flex';
	formContainer.style.display = 'none';
	headingContianer.style.display = 'none';

	pdfViewer.classList.remove('show');
	const thumbnailSidebar = document.getElementById('thumbnail-sidebar');
	thumbnailSidebar.classList.remove('show');

	const resetBtn = document.getElementById('reset-btn');
	const addSignBtn = document.getElementById('add-sign-btn');
	resetBtn.classList.remove('show');
	addSignBtn.classList.remove('show');

	setTimeout(() => {
		pdfViewer.classList.add('show');
	}, 50);

	setTimeout(() => {
		thumbnailSidebar.classList.add('show');
	}, 500);

	showButtons();
}

function handleFileUpload(file) {
	if (file && file.type === 'application/pdf') {
		const fileReader = new FileReader();
		fileReader.onload = function (e) {
			const arrayBuffer = e.target.result;
			localStorage.setItem('storedPDF', arrayBufferToBase64(arrayBuffer));
			renderPDF(arrayBuffer);
			showButtons();
			animatePDFViewer();
		};
		fileReader.readAsArrayBuffer(file);
	} else {
		alert('Please upload a valid PDF file.');
	}
}

function arrayBufferToBase64(buffer) {
	let binary = '';
	const bytes = new Uint8Array(buffer);
	const len = bytes.byteLength;
	for (let i = 0; i < len; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return window.btoa(binary);
}

function base64ToArrayBuffer(base64) {
	const binaryString = window.atob(base64);
	const len = binaryString.length;
	const bytes = new Uint8Array(len);
	for (let i = 0; i < len; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}
	return bytes.buffer;
}

window.addEventListener('load', () => {
	const storedPDF = localStorage.getItem('storedPDF');
	if (storedPDF) {
		const arrayBuffer = base64ToArrayBuffer(storedPDF);
		renderPDF(arrayBuffer);
		showButtons();
		animatePDFViewer();
	} else {
		hideButtons();
		document.getElementById('pdf-viewer').style.display = 'none';
		formContainer.style.display = 'flex';
	}
});

let thumbnailListeners = [];

async function renderPDF(arrayBuffer) {
	const pdf = await pdfjsLib.getDocument({
		data: arrayBuffer,
	}).promise;
	const numPages = pdf.numPages;
	const thumbnailSidebar = document.getElementById('thumbnail-sidebar');
	const pdfContainer = document.getElementById('pdf-container');

	removeThumbnailListeners();

	createIntersectionObserver();

	let maxWidth = 0;

	for (let pageNumber = 1; pageNumber <= numPages; pageNumber++) {
		const page = await pdf.getPage(pageNumber);
		const thumbnailViewport = page.getViewport({
			scale: 0.3,
		});
		const thumbnailCanvas = document.createElement('canvas');
		thumbnailCanvas.className = 'thumbnail-canvas';
		thumbnailCanvas.dataset.pageNumber = pageNumber;
		const thumbnailContext = thumbnailCanvas.getContext('2d');
		thumbnailCanvas.height = thumbnailViewport.height;
		thumbnailCanvas.width = thumbnailViewport.width;
		thumbnailSidebar.appendChild(thumbnailCanvas);
		const thumbnailRenderContext = {
			canvasContext: thumbnailContext,
			viewport: thumbnailViewport,
		};
		await page.render(thumbnailRenderContext).promise;

		const thumbnailClickListener = () => {
			const targetPageCanvas = document.querySelector(`.pdf-page-canvas[data-page-number="${pageNumber}"]`);
			if (targetPageCanvas) {
				const pdfWrapper = document.getElementById('pdf-wrapper');
				const topPos = targetPageCanvas.offsetTop - pdfContainer.offsetTop;
				pdfWrapper.scrollTo({
					top: topPos,
					behavior: 'smooth',
				});
			}
		};

		thumbnailCanvas.addEventListener('click', thumbnailClickListener);
		thumbnailListeners.push({ element: thumbnailCanvas, listener: thumbnailClickListener });

		const mainViewport = page.getViewport({
			scale: 1.5,
		});
		const mainCanvas = document.createElement('canvas');
		mainCanvas.className = 'pdf-page-canvas';
		const mainContext = mainCanvas.getContext('2d');
		mainCanvas.height = mainViewport.height;
		mainCanvas.width = mainViewport.width;
		pdfContainer.appendChild(mainCanvas);
		const mainRenderContext = {
			canvasContext: mainContext,
			viewport: mainViewport,
		};
		await page.render(mainRenderContext).promise;

		if (pageNumber === 1) {
			maxWidth = Math.max(maxWidth, mainCanvas.width);
			setContainerWidth(maxWidth);
		}

		mainCanvas.dataset.pageNumber = pageNumber;
		observer.observe(mainCanvas);
	}
}

function removeThumbnailListeners() {
	thumbnailListeners.forEach(({ element, listener }) => {
		element.removeEventListener('click', listener);
	});
	thumbnailListeners = [];
}

function setContainerWidth(width) {
	const pdfContainer = document.getElementById('pdf-container');
	const pdfWrapper = document.getElementById('pdf-wrapper');
	pdfContainer.style.width = `${width}px`;
	pdfWrapper.style.width = `${width}px`;
}

let observer;

function createIntersectionObserver() {
	const observerOptions = {
		root: document.getElementById('pdf-wrapper'),
		rootMargin: '0px',
		threshold: 0.25,
	};

	observer = new IntersectionObserver((entries) => {
		entries.forEach((entry) => {
			if (entry.isIntersecting) {
				const pageNumber = parseInt(entry.target.dataset.pageNumber);
				highlightThumbnail(pageNumber);
			}
		});
	}, observerOptions);
}

function disconnectIntersectionObserver() {
	if (observer) {
		observer.disconnect();
		observer = null;
	}
}

function highlightThumbnail(pageNumber) {
	const thumbnails = document.querySelectorAll('.thumbnail-canvas');
	let highlightedThumbnail;

	thumbnails.forEach((thumbnail) => {
		if (parseInt(thumbnail.dataset.pageNumber) === pageNumber) {
			thumbnail.style.border = '1px solid #141414';
			highlightedThumbnail = thumbnail;
		} else {
			thumbnail.style.border = 'none';
		}
	});

	if (highlightedThumbnail) {
		const thumbnailSidebar = document.getElementById('thumbnail-sidebar');
		const thumbnailRect = highlightedThumbnail.getBoundingClientRect();
		const sidebarRect = thumbnailSidebar.getBoundingClientRect();

		if (pageNumber !== 1 && pageNumber !== thumbnails.length) {
			const targetScrollTop =
				highlightedThumbnail.offsetTop - thumbnailSidebar.offsetTop - sidebarRect.height / 2 + thumbnailRect.height / 2;
			thumbnailSidebar.scrollTop = targetScrollTop;
		} else {
			if (thumbnailRect.bottom > sidebarRect.bottom) {
				thumbnailSidebar.scrollTop += thumbnailRect.bottom - sidebarRect.bottom;
			}
			if (thumbnailRect.top < sidebarRect.top) {
				thumbnailSidebar.scrollTop -= sidebarRect.top - thumbnailRect.top;
			}
		}
	}
}

let modalInitialized = false;
let currentSignatureDataURL = null;

document.getElementById('add-sign-btn').addEventListener('click', function () {
	const modalOverlay = document.getElementById('modal-overlay');
	modalOverlay.style.display = 'flex';
	setTimeout(() => modalOverlay.classList.add('show'), 10);

	if (!modalInitialized) {
		initializeModal();
		modalInitialized = true;
	} else {
		const canvas = document.getElementById('signature-canvas');
		const signaturePad = new SignaturePad(canvas);
		signaturePad.clear();
	}
});

function initializeModal() {
	const canvas = document.getElementById('signature-canvas');
	const signaturePad = new SignaturePad(canvas);

	const signatureContainer = document.querySelector('.signature-container');
	const editableArea = document.querySelector('.editable-area');

	document.getElementById('clear-signature-btn').addEventListener('click', function () {
		if (canvas.style.display !== 'none') {
			signaturePad.clear();
		} else {
			editableArea.textContent = '';
			signatureContainer.classList.remove('show-suggestions');
		}
	});

	document.getElementById('save-signature-btn').addEventListener('click', function () {
		if (canvas.style.display !== 'none') {
			if (signaturePad.isEmpty()) {
				alert('Please provide a signature first.');
			} else {
				const dataURL = signaturePad.toDataURL();
				createCursorSignature(dataURL);
				closeModal();
			}
		} else {
			const selectedFont = document.querySelector('input[name="fontSelection"]:checked');
			if (!selectedFont) {
				alert('Please select a font style.');
				return;
			}
			const text = document.querySelector('.editable-area').textContent.trim();
			if (!text) {
				alert('Please type your signature.');
				return;
			}
			const dataURL = convertTextToImage(text, selectedFont.id);
			createCursorSignature(dataURL);
			editableArea.textContent = '';
			signatureContainer.classList.remove('show-suggestions');
			closeModal();
		}
	});

	document.getElementById('download-pdf-btn').addEventListener('click', function () {
		const url = this.getAttribute('data-url');
		if (url) {
			const a = document.createElement('a');
			a.href = url;
			a.download = 'signed_document.pdf';
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			this.classList.remove('show');
			setTimeout(() => {
				this.style.display = 'none';
			}, 300);
		} else {
			alert('No signature has been added yet.');
		}
	});

	const modalOverlay = document.getElementById('modal-overlay');
	modalOverlay.addEventListener('click', (event) => {
		if (event.target === modalOverlay) {
			closeModal();
		}
	});

	enableScrollingWhileDragging();
}

function convertTextToImage(text, fontId) {
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');

	const selectedSuggestion = document.querySelector(`#${fontId}`).closest('.suggestion-container').querySelector('.handwritten');
	const fontFamily = selectedSuggestion ? getComputedStyle(selectedSuggestion).fontFamily : 'Arial';

	ctx.font = '48px ' + fontFamily;
	const textMetrics = ctx.measureText(text);
	canvas.width = textMetrics.width + 20;
	canvas.height = 70;

	ctx.clearRect(0, 0, canvas.width, canvas.height);

	ctx.font = '48px ' + fontFamily;
	ctx.fillStyle = 'black';
	ctx.fillText(text, 10, 50);

	return canvas.toDataURL('image/png');
}

function closeModal() {
	const modalOverlay = document.getElementById('modal-overlay');
	modalOverlay.classList.remove('show');
	setTimeout(() => (modalOverlay.style.display = 'none'), 300);
}

function createCursorSignature(dataURL) {
	removePreviousCursorSignature();

	currentSignatureDataURL = dataURL;

	const img = document.createElement('img');
	img.src = dataURL;
	img.id = 'cursor-signature';
	img.style.position = 'fixed';
	img.style.pointerEvents = 'none';
	img.style.zIndex = '1000';
	img.style.opacity = '0';
	document.body.appendChild(img);

	img.style.left = '-1000px';
	img.style.top = '-1000px';

	function handleMouseMove(event) {
		moveSignatureWithCursor(event);
		img.style.opacity = '1';
		document.removeEventListener('mousemove', handleMouseMove);
		document.addEventListener('mousemove', moveSignatureWithCursor);
	}

	document.addEventListener('mousemove', handleMouseMove);

	document.querySelectorAll('.pdf-page-canvas').forEach((canvas) => {
		canvas.addEventListener('click', dropSignature);
	});
}

function removePreviousCursorSignature() {
	const previousCursorSignature = document.getElementById('cursor-signature');
	if (previousCursorSignature) {
		previousCursorSignature.remove();
	}
	document.removeEventListener('mousemove', moveSignatureWithCursor);
	document.querySelectorAll('.pdf-page-canvas').forEach((canvas) => {
		canvas.removeEventListener('click', dropSignature);
	});
}

function moveSignatureWithCursor(event) {
	const img = document.getElementById('cursor-signature');
	if (img) {
		const imgWidth = img.offsetWidth;
		const imgHeight = img.offsetHeight;
		img.style.left = `${event.clientX - imgWidth / 2}px`;
		img.style.top = `${event.clientY - imgHeight / 2}px`;
	}
}

async function dropSignature(event) {
	if (!currentSignatureDataURL) return;

	const canvas = event.target;
	const canvasRect = canvas.getBoundingClientRect();
	const cursorSignature = document.getElementById('cursor-signature');

	const signatureWidth = cursorSignature.offsetWidth;
	const signatureHeight = cursorSignature.offsetHeight;

	const x = event.clientX - canvasRect.left - signatureWidth / 2;
	const y = event.clientY - canvasRect.top - signatureHeight / 2;

	const context = canvas.getContext('2d');
	const signatureImage = new Image();
	signatureImage.src = currentSignatureDataURL;

	signatureImage.onload = async function () {
		context.drawImage(signatureImage, x, y, signatureWidth, signatureHeight);
		await saveCanvasToPDF();
	};

	removePreviousCursorSignature();
	currentSignatureDataURL = null;
}

async function saveCanvasToPDF() {
	const storedPDF = localStorage.getItem('storedPDF');
	if (!storedPDF) {
		alert('No PDF file found.');
		return;
	}

	const arrayBuffer = base64ToArrayBuffer(storedPDF);

	const pdfLibDoc = await PDFLib.PDFDocument.load(arrayBuffer);
	const pages = pdfLibDoc.getPages();

	for (let index = 0; index < pages.length; index++) {
		const canvas = document.querySelector(`.pdf-page-canvas[data-page-number="${index + 1}"]`);
		const imgData = canvas.toDataURL('image/png');
		const { width, height } = canvas;

		const img = await pdfLibDoc.embedPng(imgData);
		const page = pages[index];

		page.drawImage(img, {
			x: 0,
			y: 0,
			width: page.getWidth(),
			height: page.getHeight(),
		});
	}

	const updatedPdfBytes = await pdfLibDoc.save();
	const blob = new Blob([updatedPdfBytes], {
		type: 'application/pdf',
	});
	const url = URL.createObjectURL(blob);

	const downloadBtn = document.getElementById('download-pdf-btn');
	downloadBtn.setAttribute('data-url', url);
	downloadBtn.style.display = 'block';
	setTimeout(() => {
		downloadBtn.classList.add('show');
	}, 90);
}

function enableScrollingWhileDragging() {
	document.addEventListener('mousemove', function (event) {
		const scrollMargin = 20;
		const scrollStep = 20;

		if (event.clientY < scrollMargin) {
			window.scrollBy(0, -scrollStep);
		} else if (event.clientY > window.innerHeight - scrollMargin) {
			window.scrollBy(0, scrollStep);
		}

		if (event.clientX < scrollMargin) {
			window.scrollBy(-scrollStep, 0);
		} else if (event.clientX > window.innerWidth - scrollMargin) {
			window.scrollBy(scrollStep, 0);
		}
	});
}

document.getElementById('reset-btn').addEventListener('click', function () {
	localStorage.removeItem('storedPDF');
	removeThumbnailListeners();
	disconnectIntersectionObserver();

	const pdfContainer = document.getElementById('pdf-container');
	const thumbnailSidebar = document.getElementById('thumbnail-sidebar');
	pdfContainer.innerHTML = '';
	thumbnailSidebar.innerHTML = '';

	document.getElementById('pdf-viewer').style.display = 'none';
	hideButtons();

	formContainer.style.display = 'flex';
	headingContianer.style.display = 'block';

	document.querySelector('.default-file-input').value = '';

	resetDragFileArea();

	const cursorSignature = document.getElementById('cursor-signature');
	if (cursorSignature) cursorSignature.remove();

	const downloadBtn = document.getElementById('download-pdf-btn');
	downloadBtn.style.display = 'none';
	downloadBtn.classList.remove('show');
});

document.getElementById('type-signature-btn').addEventListener('click', function () {
	document.querySelector('.editable-area').textContent = '';
	document.querySelector('.suggestions').innerHTML = '';
	const editableArea = document.querySelector('.editable-area');
	const suggestions = document.querySelector('.suggestions');
	const fonts = ['Gluten', 'Kalam', 'Courgette'];

	function debounce(func, wait) {
		let timeout;
		return function executedFunction(...args) {
			const later = () => {
				clearTimeout(timeout);
				func(...args);
			};
			clearTimeout(timeout);
			timeout = setTimeout(later, wait);
		};
	}

	const updateSuggestions = debounce(() => {
		const text = editableArea.textContent.trim();
		if (text) {
			const fragment = document.createDocumentFragment();
			fonts.forEach((font, index) => {
				const suggestionContainer = document.createElement('div');
				suggestionContainer.className = 'suggestion-container';

				const suggestion = document.createElement('div');
				suggestion.className = 'handwritten';
				suggestion.style.fontFamily = font;
				suggestion.textContent = text;
				suggestion.dataset.index = index;

				const radio = document.createElement('input');
				radio.type = 'radio';
				radio.name = 'fontSelection';
				radio.id = `font-${index}`;

				suggestionContainer.addEventListener('click', () => {
					radio.checked = true;
					document.querySelectorAll('.suggestion-container').forEach((el) => el.classList.remove('selected'));
					suggestionContainer.classList.add('selected');
				});

				radio.addEventListener('change', () => {
					if (radio.checked) {
						document.querySelectorAll('.suggestion-container').forEach((el) => el.classList.remove('selected'));
						suggestionContainer.classList.add('selected');
					}
				});

				suggestionContainer.appendChild(suggestion);
				suggestionContainer.appendChild(radio);
				fragment.appendChild(suggestionContainer);
			});
			suggestions.textContent = '';
			suggestions.appendChild(fragment);
			signatureContainer.classList.add('show-suggestions');
		} else {
			signatureContainer.classList.remove('show-suggestions');
		}
	}, 50);

	const charLimit = 25;

	editableArea.addEventListener('input', () => {
		let text = editableArea.textContent;
		if (text.length > charLimit) {
			editableArea.textContent = text.slice(0, charLimit);
			const range = document.createRange();
			const sel = window.getSelection();
			range.setStart(editableArea.childNodes[0], charLimit);
			range.collapse(true);
			sel.removeAllRanges();
			sel.addRange(range);
			editableArea.classList.add('vibrate');
			setTimeout(() => {
				editableArea.classList.remove('vibrate');
			}, 300);
		}
		updateSuggestions();
	});

	const canvas = document.getElementById('signature-canvas');
	const signatureContainer = document.querySelector('.signature-container');
	const typeManuallyBtn = this;

	if (canvas.style.display !== 'none') {
		canvas.style.display = 'none';
		signatureContainer.style.display = 'block';
		typeManuallyBtn.textContent = 'Draw Manually';
	} else {
		canvas.style.display = 'block';
		signatureContainer.style.display = 'none';
		typeManuallyBtn.textContent = 'Type Manually';
		updateSuggestions();
	}
});

function showButtons() {
	const resetBtn = document.getElementById('reset-btn');
	const addSignBtn = document.getElementById('add-sign-btn');

	resetBtn.classList.remove('hidden');
	addSignBtn.classList.remove('hidden');
	setTimeout(() => {
		resetBtn.classList.add('show');
		addSignBtn.classList.add('show');
	}, 500);
}

function hideButtons() {
	const resetBtn = document.getElementById('reset-btn');
	const addSignBtn = document.getElementById('add-sign-btn');

	resetBtn.classList.remove('show');
	addSignBtn.classList.remove('show');
	setTimeout(() => {
		resetBtn.classList.add('hidden');
		addSignBtn.classList.add('hidden');
	}, 500);
}
