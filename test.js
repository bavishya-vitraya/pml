let a = {}
a["b"] ||= "D"
if (a.b == "D")
    console.log("S")
else
    console.log("F")