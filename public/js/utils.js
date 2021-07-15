function syntaxHighlight(json) {
    json = json.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        var cls = "number";
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = "key";
            } else {
                cls = "string";
            }
        } else if (/true|false/.test(match)) {
            cls = "boolean";
        } else if (/null/.test(match)) {
            cls = "null";
        }
        return "<span class='" + cls + "'>" + match + "</span>";
    });
}
function generateRandomHexColor() {
    let colorGenerated="#" + (Math.random() * 0xfffff * 1000000).toString(16).slice(0, 6);
    if(colorGenerated !== "#0000ff" && colorGenerated !== "#ff0000") {
      return colorGenerated;
    }
    colorGenerated="#" + (Math.random() * 0xfffff * 1000000).toString(16).slice(0, 6);
}
function replaceAll(input,search,newText) {
    let result=input.split(search).join(newText);
    return result;
}
function deepCopyObj(obj) {
    let result={}
    for(let o in obj) {
        result[o]=obj[o]
    }
    return result;
}
/*
function autocomplete(searchEle, arr) {
    let currentFocus;
    searchEle.addEventListener("input", function(e) {
     var divCreate,b,i,
     fieldVal = this.value;
     closeAllLists();
     if (!fieldVal) {
        return false;
     }
     currentFocus = -1;
     divCreate = document.createElement("DIV");
     divCreate.setAttribute("id", this.id + "autocomplete-list");
     divCreate.setAttribute("class", "autocomplete-items");
     this.parentNode.appendChild(divCreate);
     for (i = 0; i <arr.length; i++) {
        if ( arr[i].substr(0, fieldVal.length).toUpperCase() == fieldVal.toUpperCase() ) {
           b = document.createElement("DIV");
           b.innerHTML = "<strong>" + arr[i].substr(0, fieldVal.length) + "</strong>";
           b.innerHTML += arr[i].substr(fieldVal.length);
           b.innerHTML += "<input type='hidden' value='" + arr[i] + "'>";
           b.addEventListener("click", function(e) {
              searchEle.value = this.getElementsByTagName("input")[0].value;
              closeAllLists();
           });
           divCreate.appendChild(b);
        }
     }
  });
  searchEle.addEventListener("keydown", function(e) {
     let autocompleteList = document.getElementById(
        this.id + "autocomplete-list"
     );
     if (autocompleteList)
        autocompleteList = autocompleteList.getElementsByTagName("div");
     if (e.keyCode == 40) {
        currentFocus++;
        addActive(autocompleteList);
     }
     else if (e.keyCode == 38) { //up
        currentFocus--;
        addActive(autocompleteList);
     }
     else if (e.keyCode == 13) {
        e.preventDefault();
        if (currentFocus > -1) {
           if (autocompleteList) autocompleteList[currentFocus].click();
        }
     }
  });
  function addActive(autocompleteList) {
     if (!autocompleteList) return false;
        removeActive(autocompleteList);
     if (currentFocus >= autocompleteList.length) currentFocus = 0;
     if (currentFocus < 0) currentFocus = autocompleteList.length - 1;
     autocompleteList[currentFocus].classList.add("autocomplete-active");
  }
  function removeActive(autocompleteList) {
     for (let i = 0; i < autocompleteList.length; i++) {
        autocompleteList[i].classList.remove("autocomplete-active");
     }
  }
  function closeAllLists(elmnt) {
     let autocompleteList = document.getElementsByClassName(
        "autocomplete-items"
     );
     for (let i = 0; i < autocompleteList.length; i++) {
        if (elmnt != autocompleteList[i] && elmnt != searchEle) {
           autocompleteList[i].parentNode.removeChild(autocompleteList[i]);
        }
     }
  }
  document.addEventListener("click", function(e) {
     closeAllLists(e.target);
  });
}
*/