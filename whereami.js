// ==UserScript==
// @name         Tommy's Tools 'Where Am I' Changes
// @match        https://itop.tylervault.com/pages/tyler-vault/whereami.php*
// @run-at       document-idle
// ==/UserScript==

const container = document.querySelector('.container');
if (!container) return;

// Get parameters from the URL
const url = new URL(window.location.href);
const urlParams = new URLSearchParams(url.search);
const agent = urlParams.get('agent');
if (!agent) return;

// Get the clock state from the agents list
const listItems = document.querySelectorAll('li');
let clockedIn = null;
for (let li of listItems) {
    if (li.textContent.includes(agent)) {
        const spans = li.querySelectorAll('span');
        if (spans.length > 0) {
            const statusSpan = spans[0];
            const symbol = statusSpan.textContent.trim();
            if (symbol === '\u2717') { // Look for the X symbol next to the current agent
                container.style.backgroundColor = '#a83232'; // Change the background color to red when clocked out; very useful
                clockedIn = false;
            } else {
                container.style.backgroundColor = '#268026';
                clockedIn = true;
            }
            break;
        }
    }
}

// Replace the clock in/out button with custom shortcuts
let clockId = null;
const targetForm = document.querySelector('form[action*="Clock.php"]');
if (targetForm) {
    clockId = targetForm.querySelector('input[name="id"]')?.value;
    const logoLink = document.querySelector('a.btn-link[title="Home"]');
    if (logoLink) logoLink.remove();

    const parent = targetForm.parentNode;
    parent.style.textAlign = 'center';
    parent.style.width = '100%';

    const btnContainer = document.createElement('div');
    btnContainer.id = 'tm-custom-buttons';
    Object.assign(btnContainer.style, {
        display: 'inline-block',
        margin: '0 auto',
        padding: '0',
        verticalAlign: 'middle'
    });

    // Helper functions

    const getTimestampedStatus = (status) => {
        const time = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        return `${status} @ ${time}`;
    };

    const getRedirectUrl = (status, clockAction) => {
        const baseUrl = "https://itop.tylervault.com/pages/tyler-vault/whereami.php";
        const timestampedStatus = getTimestampedStatus(status);
        return `${baseUrl}?agent=${encodeURIComponent(agent)}&auto_reload=true&auto_status=${encodeURIComponent(timestampedStatus)}&auto_location=&auto_clock=${clockAction}`;
    };

    const createBtn = (text, onClick) => {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.type = 'button';
        btn.style.margin = '0rem 0.5rem';
        btn.addEventListener('click', onClick);
        return btn;
    };

    // Check if the user is "off-site"
    let isOffSite = false;
    const agentLi = Array.from(document.querySelectorAll('li')).find(li => li.textContent.includes(agent));
    if (agentLi) {
        isOffSite = agentLi.textContent.toLowerCase().includes("off-site");
    }

    // Create new buttons!

    const btnClock = createBtn(
        clockedIn ? 'Clock Out' : 'Clock In', // If the agent is clocked in, show the "clock out" button instead
        () => {
            const status = clockedIn ? "away" : "in office";
            window.location.href = getRedirectUrl(status, clockedIn ? "out" : "in");
        }
    );

    const btnOffSite = createBtn(
        isOffSite ? 'In Office' : 'Off-Site', // If the agent is "off-site", change the button to "in office"
        () => {
            const status = isOffSite ? "in office" : "off-site";
            window.location.href = getRedirectUrl(status, "in");
        }
    );

    const btnAtLunch = createBtn('At Lunch', () => {
        window.location.href = getRedirectUrl("at lunch", "out");
    });

    btnContainer.appendChild(btnClock);
    btnContainer.appendChild(btnOffSite);
    btnContainer.appendChild(btnAtLunch);

    // Replace the old button with the new ones
    parent.replaceChild(btnContainer, targetForm);
}

// Auto apply changes based on URL params
const reloadParam = getAndDeleteURLParameter('auto_reload', urlParams);
if (reloadParam !== null) { // Refresh the page when the "auto_reload" parameter exists
    showLoadingOverlay();
    url.search = urlParams.toString();
    window.location.href = url.toString();
} else {
    const statusParam = getAndDeleteURLParameter('auto_status', urlParams);
    if (statusParam !== null) { // Update the status/message with the "auto_status" parameter
        showLoadingOverlay();
        url.search = urlParams.toString(); window.history.replaceState(null, '', url.toString());
        const input = document.querySelector('input[name="agent_message"]');
        const form = input?.closest('form');
        if (input && form) {
            const current = input.value.trim();
            const desired = decodeURIComponent(statusParam).trim();
            if (current !== desired) {
                input.value = desired;
                form.submit();
            } else {
                window.location.href = url.toString();
            }
        } else {
            window.location.href = url.toString();
        }
    } else {
        const clockParam = getAndDeleteURLParameter('auto_clock', urlParams);
        if (clockParam !== null) {  // Clock in/out based on the "auto_clock" parameter
            showLoadingOverlay();
            url.search = urlParams.toString();
            window.history.replaceState(null, '', url.toString());
            const desiredState = clockParam.toLowerCase() === 'in';
            if (clockedIn !== desiredState) { // Only update if it doesn't match the current state
                let link = `https://itop.tylervault.com/pages/tyler-vault/Clock.php?id=${encodeURIComponent(clockId)}&auto=true&agent=${encodeURIComponent(agent)}`;
                const locationParam = getAndDeleteURLParameter('auto_location', urlParams);
                if (locationParam !== null) {
                    url.search = urlParams.toString(); window.history.replaceState(null, '', url.toString());
                    link += `&auto_location=${locationParam}`; // Add the location parameter, since we need to update the location after clocking in/out
                }
                window.location.href = link;
            } else {
              window.location.href = url.toString();
            }
        } else { // Update the location with the "auto_location" parameter
            const locationParam = getAndDeleteURLParameter('auto_location', urlParams);
            if (locationParam !== null) {
                showLoadingOverlay();
                url.search = urlParams.toString(); window.history.replaceState(null, '', url.toString());
                const select = document.querySelector('select[name="selected_org"]');
                const form = select?.form;
                if (select && form) {
                    const desired = decodeURIComponent(locationParam).trim();
                    const matchingOption = Array.from(select.options).find(
                        opt => opt.value === desired
                    );
                    // if (matchingOption && select.value !== desired) {
                    if (matchingOption) {
                        select.value = desired;
                        form.submit();
                    } else {
                        hideLoadingOverlay();
                    }
                } else {
                    hideLoadingOverlay();
                }
            }
        }
    }
}

// Remove task.task agent, and move current agent to the top
const ulParent = document.querySelector('ul');
if (ulParent) {
    listItems.forEach(li => {
        const anchor = li.querySelector('a');
        if (anchor && anchor.href.includes("task.task")) li.remove();
        if (anchor && anchor.href.includes(agent)) ulParent.insertBefore(li, ulParent.firstChild);
    });
}

// Move "TylerVault" to the top of the location list
const select = document.querySelector('select[name="selected_org"]');
if (select) {
    const options = Array.from(select.options);
    const tylerVaultOption = options.find(opt => opt.value === 'TylerVault');
    if (tylerVaultOption) {
        select.removeChild(tylerVaultOption);
        select.insertBefore(tylerVaultOption, select.options[1]);
    }
}

// Helper functions

function getAndDeleteURLParameter(name, urlParams) {
    const value = urlParams.get(name);
    if (value !== null) {
        urlParams.delete(name);
    }
    return value;
}

function showLoadingOverlay() {
    if (document.getElementById('tm-loading-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'tm-loading-overlay';
    Object.assign(overlay.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '3em',
        zIndex: '99999',
        fontFamily: 'Arial, sans-serif',
    });
    overlay.textContent = 'Loading...';
    document.body.appendChild(overlay);
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('tm-loading-overlay');
    if (overlay) {
        overlay.remove();
    }
}