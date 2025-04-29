// Initialize Firebase functions at the module level
let saveUserPrompt;
let trackUserActivity;

document.addEventListener('DOMContentLoaded', async () => {
    // Import Firebase functions properly (imports must be outside of event handlers)
    try {
        const firebaseModule = await import('./firebase-config.js');
        saveUserPrompt = firebaseModule.saveUserPrompt;
        trackUserActivity = firebaseModule.trackUserActivity;
    } catch (error) {
        console.error('Error importing Firebase functions:', error);
    }

    // Elements
    const settingsButton = document.getElementById('settings-button');
    const modal = document.getElementById('api-key-modal');
    const closeButton = document.querySelector('.close-button');
    const saveApiKeyButton = document.getElementById('save-api-key');
    const apiKeyInput = document.getElementById('api-key');
    const generateButton = document.getElementById('generate-button');
    const promptInput = document.getElementById('prompt-input');
    const codeOutput = document.getElementById('code-editor');
    const copyButton = document.getElementById('copy-button');
    
    // Mobile menu elements
    const hamburgerMenu = document.getElementById('hamburgerMenu');
    const mobileNav = document.getElementById('mobileNav');
    const overlay = document.getElementById('overlay');
    const mobileMenuClose = document.getElementById('mobileMenuClose');
    
    // Mobile profile elements
    const mobileProfileSection = document.getElementById('mobileProfileSection');
    const mobileLoginSection = document.getElementById('mobileLoginSection');
    const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
    
    // Toggle mobile menu when hamburger is clicked
    if (hamburgerMenu) {
        hamburgerMenu.addEventListener('click', () => {
            hamburgerMenu.classList.toggle('active');
            mobileNav.classList.toggle('active');
            overlay.classList.toggle('active');
            document.body.style.overflow = mobileNav.classList.contains('active') ? 'hidden' : '';
        });
    }
    
    // Close mobile menu when overlay is clicked
    if (overlay) {
        overlay.addEventListener('click', () => {
            hamburgerMenu.classList.remove('active');
            mobileNav.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        });
    }
    
    // Close mobile menu when close button is clicked
    if (mobileMenuClose) {
        mobileMenuClose.addEventListener('click', () => {
            hamburgerMenu.classList.remove('active');
            mobileNav.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        });
    }
    
    // Mobile navigation links click handling
    if (mobileNav) {
        const mobileNavLinks = mobileNav.querySelectorAll('.mobile-nav-links a');
        mobileNavLinks.forEach(link => {
            link.addEventListener('click', () => {
                hamburgerMenu.classList.remove('active');
                mobileNav.classList.remove('active');
                overlay.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }
    
    // Mobile logout button functionality
    if (mobileLogoutBtn) {
        mobileLogoutBtn.addEventListener('click', async () => {
            try {
                const { getAuth, signOut } = await import("https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js");
                const auth = getAuth();
                await signOut(auth);
                
                // Close mobile menu
                hamburgerMenu.classList.remove('active');
                mobileNav.classList.remove('active');
                overlay.classList.remove('active');
                document.body.style.overflow = '';
                
                // Redirect to home
                window.location.href = 'index.html';
            } catch (error) {
                console.error('Logout failed:', error);
                showNotification('Error logging out', 'error');
            }
        });
    }
    
    // Verify all required elements exist before proceeding
    if (!settingsButton || !modal || !closeButton || !saveApiKeyButton || 
        !apiKeyInput || !generateButton || !promptInput || !codeOutput) {
        console.error('Some required elements are missing from the DOM');
        return; // Prevent execution if elements are missing
    }
    
    // Create necessary elements that are missing
    let lineNumbers = document.createElement('div');
    lineNumbers.id = 'line-numbers';
    
    const modelDropdown = document.getElementById('model-dropdown');
    const languageDropdown = document.getElementById('language-dropdown');
    const saveButton = document.getElementById('save-button');
    
    // Create element for highlighting if it doesn't exist
    let highlightingCode = document.createElement('div');
    highlightingCode.id = 'highlighting-code';
    
    // Default API key
    let apiKey = localStorage.getItem('openrouter_api_key') || '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';
    localStorage.setItem('openrouter_api_key', apiKey);
    
    // Initialize CodeMirror editor (to replace the highlighting logic)
    let editor = null;
    if(codeOutput) {
        try {
            editor = CodeMirror.fromTextArea(codeOutput, {
                lineNumbers: true,
                theme: "monokai",
                mode: "javascript",
                matchBrackets: true,
                autoCloseBrackets: true,
                styleActiveLine: true,
                tabSize: 4,
                indentWithTabs: false,
                lineWrapping: true
            });
        } catch (e) {
            console.error('Error initializing CodeMirror:', e);
        }
    }
    
    // Function that was missing
    function adjustEditorLayout() {
        if (editor) {
            editor.refresh();
        }
    }
    
    // Define models
    const models = [
        { id: "deepseek/deepseek-chat-v3-0324:free", name: "DeepSeek V3 0324 pro" },
        { id: "agentica-org/deepcoder-14b-preview:free", name: "DeepCoder 14B Preview" },
        { id: "deepseek/deepseek-r1-distill-llama-70b:free", name: "DeepSeek R1 Distill Llama 70B " },
        { id: "nvidia/llama-3.1-nemotron-nano-8b-v1:free", name: "Llama 3.1 Nemotron Nano 8B " },
        { id: "nvidia/llama-3.3-nemotron-super-49b-v1:free", name: "Llama 3.3 Nemotron Super 49B" },
        { id: "nvidia/llama-3.1-nemotron-ultra-253b-v1:free", name: "Llama 3.1 Nemotron Ultra 253B pro" },
        { id: "moonshotai/kimi-vl-a3b-thinking:free", name: "Moonshot AI Kimi VL A3B Thinking " },
        { id: "openrouter/optimus-alpha:free", name: "Optimus Alpha " },
        { id: "openrouter/quasar-alpha:free", name: "Quasar Alpha " },
        { id: "qwen/qwen-2.5-coder-32b-instruct:free", name: "Qwen 2.5 Coder 32B pro" },
        { id: "open-r1/olympiccoder-32b:free", name: "OlympicCoder 32B pro" },
        { id: "deepseek/deepseek-v3-base:free", name: "DeepSeek V3 Base" },
    ];
    
    // Populate model dropdown
    if (modelDropdown) {
        modelDropdown.innerHTML = '';
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.name;
            modelDropdown.appendChild(option);
        });
    }
    
    // Update syntax highlighting - modified to use CodeMirror instead of Prism
    function updateHighlighting() {
        if (!editor || !languageDropdown) return;
        
        const language = languageDropdown.value;
        
        // Update CodeMirror mode based on selected language
        editor.setOption("mode", getCodeMirrorMode(language));
        editor.refresh();
    }
    
    // Helper function to map language dropdown values to CodeMirror modes
    function getCodeMirrorMode(language) {
        const modeMap = {
            'javascript': 'javascript',
            'html': 'htmlmixed',
            'css': 'css',
            'python': 'python',
            'java': 'text/x-java',
            'php': 'php',
            'ruby': 'ruby',
            'c': 'text/x-csrc',
            'cpp': 'text/x-c++src',
            'go': 'go',
            'rust': 'rust'
        };
        
        return modeMap[language] || language;
    }
    
    // Synchronize scroll position between editable and highlighting - simplified since we use CodeMirror
    function syncScroll() {
        // Not needed with CodeMirror as it handles scrolling internally
    }
    
    // Update line numbers in the code editor
    function updateLineNumbers() {
        if (!codeOutput) return;
        
        const codeLines = codeOutput.textContent.split('\n');
        lineNumbers.innerHTML = '';
        
        for (let i = 1; i <= codeLines.length; i++) {
            const lineNumber = document.createElement('div');
            lineNumber.textContent = i;
            lineNumbers.appendChild(lineNumber);
        }
    }
    
    // Modal controls
    if (settingsButton && modal && closeButton) {
        settingsButton.addEventListener('click', () => {
            if (apiKey) {
                apiKeyInput.value = apiKey;
            }
            modal.style.display = 'block';
        });
        
        closeButton.addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
    
    // Save API key
    if (saveApiKeyButton && apiKeyInput) {
        saveApiKeyButton.addEventListener('click', () => {
            apiKey = apiKeyInput.value.trim();
            if (apiKey) {
                localStorage.setItem('openrouter_api_key', apiKey);
                modal.style.display = 'none';
                showNotification('API key saved!', 'success');
            } else {
                showNotification('Please enter an API key', 'error');
            }
        });
    }
    
    // Add copy button functionality
    if (copyButton && editor) {
        copyButton.addEventListener('click', async () => {
            const code = editor.getValue();
            if (!code || code === 'Generating code...') {
                showNotification('No code to copy', 'error');
                return;
            }
            
            try {
                await navigator.clipboard.writeText(code);
                // Update button UI to show success
                copyButton.innerHTML = '<i class="fas fa-check"></i>';
                showNotification('Code copied to clipboard!', 'success');
                
                // Reset button after 2 seconds
                setTimeout(() => {
                    copyButton.innerHTML = '<i class="far fa-copy"></i>';
                }, 2000);
                
            } catch (err) {
                console.error('Failed to copy code:', err);
                showNotification('Failed to copy code', 'error');
            }
        });
    }
    
    // Generate code
    if (generateButton && promptInput) {
        generateButton.addEventListener('click', async () => {
            const prompt = promptInput.value.trim();
            const selectedModel = modelDropdown ? modelDropdown.value : models[0].id;
            const selectedLanguage = languageDropdown ? languageDropdown.value : 'javascript';
            
            if (!apiKey) {
                showNotification('Please set your OpenRouter API key first', 'error');
                if (settingsButton) settingsButton.click();
                return;
            }
            
            if (!prompt) {
                showNotification('Please enter a prompt', 'error');
                return;
            }
            
            // Show loading state
            generateButton.disabled = true;
            generateButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
            
            if (editor) {
                editor.setValue('Generating code...');
            }
            
            try {
                const code = await generateCode(prompt, selectedModel, selectedLanguage);
                
                if (editor) {
                    editor.setValue(code);
                    editor.refresh();
                }
                
                updateHighlighting();
                
                // Track prompt usage in Firebase
                try {
                    if (saveUserPrompt && trackUserActivity) {
                        await saveUserPrompt(prompt, code);
                        await trackUserActivity('aiPromptGenerate', {
                            model: selectedModel,
                            language: selectedLanguage,
                            promptLength: prompt.length
                        });
                        console.log('Successfully tracked AI prompt in Firebase');
                    } else {
                        console.warn('Firebase tracking functions not available');
                    }
                } catch (firebaseError) {
                    console.error('Error saving prompt to Firebase:', firebaseError);
                    // Don't show an error to the user as the primary function succeeded
                }
            } catch (error) {
                console.error('Error generating code:', error);
                if (editor) {
                    editor.setValue(`Error: ${error.message || 'Failed to generate code'}`);
                }
                showNotification('Failed to generate code', 'error');
            } finally {
                // Reset button state
                generateButton.disabled = false;
                generateButton.innerHTML = '<i class="fas fa-code"></i> Generate Code';
            }
        });
    }
    
    // Save generated code
    if (saveButton && editor) {
        saveButton.addEventListener('click', async () => {
            const code = editor ? editor.getValue() : '';
            if (!code || code === 'Generating code...') {
                showNotification('No code to save', 'error');
                return;
            }
            
            const selectedLanguage = languageDropdown ? languageDropdown.value : 'javascript';
            
            // Try to save to Firebase first if user is logged in
            try {
                const titlePrompt = prompt('Enter a title for this code snippet:', 'My Code Snippet');
                if (!titlePrompt) return; // User canceled
                
                const isPublic = confirm('Would you like to make this code public so others can view it?');
                
                // Import dynamically to avoid circular dependency
                const { saveUserCode } = await import('./firebase-config.js');
                const result = await saveUserCode(code, selectedLanguage, titlePrompt, isPublic);
                
                if (result.success) {
                    showNotification(`Code saved! Share URL: ${result.shareUrl}`, 'success');
                    
                    // Copy share URL to clipboard
                    if (confirm('Copy share URL to clipboard?')) {
                        navigator.clipboard.writeText(result.shareUrl);
                    }
                    
                    return; // Skip local download if Firebase save succeeded
                } else {
                    // If Firebase save failed but user is not logged in, prompt to log in
                    if (result.error === "User not authenticated") {
                        if (confirm('Please log in to save code online. Would you like to download the code locally instead?')) {
                            // Continue with local download
                        } else {
                            window.location.href = 'login.html?returnTo=aichat.html';
                            return; // User chose to login
                        }
                    } else {
                        console.error('Error saving to Firebase:', result.error);
                    }
                }
            } catch (error) {
                console.error('Error saving code:', error);
                showNotification('Failed to save code', 'error');
            }
            
            // Fallback to local download
            const blob = new Blob([code], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `code${getFileExtension(selectedLanguage)}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }
    
    // Fetch and generate code from the API
    async function generateCode(prompt, model, language) {
        try {
            // Check if API key exists
            const currentApiKey = localStorage.getItem('openrouter_api_key');
            if (!currentApiKey) {
                throw new Error('API key not found. Please set your OpenRouter API key in settings.');
            }

            const response = await fetch('https://api.openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentApiKey}`,
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'Codeer.org AI Chat',
                    'Origin': window.location.origin
                },
                mode: 'cors',
                body: JSON.stringify({
                    model: model,
                    messages: [
                        {
                            role: 'system',
                            content: `You are an expert programmer. Generate code in ${language} programming language. Only output the code without any explanations or markdown.`
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.3,
                    max_tokens: 2000,
                    top_p: 0.9,
                    stream: false
                })
            });

            if (!response.ok) {
                let errorMessage = `HTTP error! status: ${response.status}`;
                try {
                    const errorDetails = await response.json();
                    errorMessage = errorDetails.error?.message || errorMessage;
                } catch (e) {
                    console.error('Error parsing error response:', e);
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            let code = data.choices?.[0]?.message?.content;

            if (!code || code.trim() === '') {
                console.error("Empty response from API:", data);
                throw new Error('No code was generated. The AI returned an empty response.');
            }

            // Clean up code by removing markdown code blocks if they exist
            code = code.replace(/^```[\w]*\n|```$/gm, '');

            // Remove any explanatory text before or after the code
            if (code.includes('\n')) {
                const lines = code.split('\n');
                let startIndex = 0;
                let endIndex = lines.length - 1;

                // Find first line of code
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].trim() !== '' && 
                        !lines[i].toLowerCase().includes('here') && 
                        !lines[i].toLowerCase().includes('following') &&
                        !lines[i].toLowerCase().includes('code')) {
                        startIndex = i;
                        break;
                    }
                }

                // Find last line of code
                for (let i = lines.length - 1; i >= 0; i--) {
                    if (lines[i].trim() !== '' && 
                        !lines[i].toLowerCase().includes('hope') && 
                        !lines[i].toLowerCase().includes('helps') &&
                        !lines[i].toLowerCase().includes('this is') &&
                        !lines[i].toLowerCase().includes('you can')) {
                        endIndex = i;
                        break;
                    }
                }

                code = lines.slice(startIndex, endIndex + 1).join('\n');
            }

            // Final check to ensure we have code
            if (!code || code.trim() === '') {
                throw new Error('Failed to extract valid code from the response');
            }

            return code;
        } catch (error) {
            console.error('Error in code generation:', error);
            showNotification(error.message || 'Failed to generate code', 'error');
            throw error;
        }
    }
    
    // Show notification
    function showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
    
    // Add notification styles
    const style = document.createElement('style');
    style.textContent = `
        .notification {
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 4px;
            color: white;
            font-size: 14px;
            opacity: 0;
            transform: translateY(10px);
            transition: opacity 0.3s, transform 0.3s;
            z-index: 1000;
        }
        
        .notification.show {
            opacity: 1;
            transform: translateY(0);
        }
        
        .notification.success {
            background-color: #4caf50;
        }
        
        .notification.error {
            background-color: #f44336;
        }
    `;
    document.head.appendChild(style);
    
    // Event Listeners for Syntax Highlighting
    if (codeOutput) {
        codeOutput.addEventListener('input', () => {
            updateLineNumbers();
            updateHighlighting();
        });
        
        codeOutput.addEventListener('scroll', syncScroll);
    }
    
    if (languageDropdown) {
        languageDropdown.addEventListener('change', updateHighlighting);
    }
    
    // Handle tab key in the editor - This is now handled by CodeMirror
    // Adding a keyboard selection handler with null checks
    function handleKeyboardSelection(e) {
        if (!this) return;
        if (!editor) return;
        
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || 
            e.key === 'ArrowLeft' || e.key === 'ArrowRight' ||
            e.key === 'Home' || e.key === 'End' ||
            ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A'))) {
            // Let the default behavior handle these keys
            return;
        }
    }

    // Add file extension helper
    function getFileExtension(language) {
        const extensionMap = {
            "html": ".html",
            "css": ".css",
            "javascript": ".js",
            "python": ".py",
            "java": ".java",
            "cpp": ".cpp",
            "c": ".c",
            "csharp": ".cs",
            "php": ".php",
            "ruby": ".rb",
            "go": ".go",
            "swift": ".swift",
            "typescript": ".ts",
            "kotlin": ".kt",
            "rust": ".rs",
            "sql": ".sql",
            "bash": ".sh",
            "powershell": ".ps1",
            "r": ".r"
        };
        return extensionMap[language] || ".txt";
    }
    
    // Initialize
    if (codeOutput) updateLineNumbers();
    updateHighlighting();
    adjustEditorLayout();
    
    // Add window resize handler for layout updates
    window.addEventListener('resize', () => {
        adjustEditorLayout();
        updateHighlighting();
    });
    
    // Initialize profile menu dropdown if in the page
    const profileButton = document.getElementById('profileButton');
    const profileMenu = document.getElementById('profileMenu');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (profileButton && profileMenu) {
        profileButton.addEventListener('click', () => {
            const parent = profileButton.parentElement;
            parent.classList.toggle('active');
            
            // Close dropdown when clicking outside
            document.addEventListener('click', function closeDropdown(e) {
                if (!profileMenu.contains(e.target) || e.target === logoutBtn) {
                    parent.classList.remove('active');
                    document.removeEventListener('click', closeDropdown);
                }
            });
        });
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                const { logoutUser } = await import('./firebase-config.js');
                await logoutUser();
                window.location.href = 'index.html';
            } catch (error) {
                console.error('Logout error:', error);
                showNotification('Error logging out', 'error');
            }
        });
    }
    
    // Mobile menu toggle functionality 
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (mobileMenuToggle && navLinks) {
        // Create hamburger icon if it doesn't exist
        if (mobileMenuToggle.children.length === 0) {
            for (let i = 0; i < 3; i++) {
                const span = document.createElement('span');
                mobileMenuToggle.appendChild(span);
            }
        }
        
        mobileMenuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            mobileMenuToggle.classList.toggle('active');
            navLinks.classList.toggle('show');
        });
        
        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (navLinks.classList.contains('show') && 
                !navLinks.contains(e.target) && 
                e.target !== mobileMenuToggle) {
                navLinks.classList.remove('show');
                mobileMenuToggle.classList.remove('active');
            }
        });
    }
});

