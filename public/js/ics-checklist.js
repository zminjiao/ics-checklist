(function()
{
    var urls = {
        'devices': '/api/devices/',
        'serviceProtocols': '/api/service-protocols/'
    };
    var devices;
    console.log('ics-checklist.js loaded');
    if (typeof jQuery == 'undefined')
    {
        console.log('jQuery failed to load or still loading...');
    }
    $(document).ready(function()
    {
        console.log('jQuery ready!');
        start();
    })

    function start()
    {
        loadDevices();
        bindSubmitButtonHandler();
    }

    function loadDevices()
    {
        $.ajax(
        {
            dataType: 'json',
            url: urls.devices,
            success: function(data)
            {
                console.log('Got JSON!');
                console.log(JSON.stringify(data, null, 2));
                devices = data;
                populateDeviceTypeList();
                bindListEventHandlers();
                $('#lst_device_types').change(); //update immediately after receiving JSON 
            }
        });
    }

    function populateDeviceTypeList()
    {
        $('#lst_device_types').empty();
        var deviceTypes = [];
        for (var i = 0; i < devices.length; i++)
        {
            var type = devices[i].type;
            if (deviceTypes.indexOf(type) == -1) deviceTypes.push(type);
        }
        $.each(deviceTypes, function(key, type)
        {
            $('#lst_device_types').append('<option value="' + type + '">' + type + '</option>');
        });
    }

    function bindListEventHandlers()
    {
        $('#lst_device_types').change(function()
        {
            var vendors = getVendorsFor(this.value); //for device type
            populateVendorListWith(vendors);
            $('#lst_vendors').change(); //force update
        });
        $('#lst_vendors').change(function()
        {
            var selectedVendor = this.value;
            var selectedType = $('#lst_device_types option:selected').text();
            var deviceSeries = getDeviceSeriesFor(selectedVendor, selectedType);
            populateDeviceSeriesListWith(deviceSeries);
            $('#lst_device_series').change(); //force update
        });
        $('#lst_device_series').change(function()
        {
            var selectedVendor = $('#lst_vendors option:selected').text();;
            var selectedType = $('#lst_device_types option:selected').text();
            var selectedSeries = this.value;
            var filteredDevices = getDevicesFor(selectedVendor, selectedType, selectedSeries);
            populateDevicesListWith(filteredDevices);
            $('#lst_devices').change(); //force update
        });
        $('#lst_devices').change(function()
        {
            loadProtocolsForDevice(this.value); //device ID
        });
    }

    function getVendorsFor(type)
    {
        var vendorsForType = [];
        for (var i = 0; i < devices.length; i++)
        {
            var vendor = devices[i].vendor;
            if (devices[i].type == type &&
                vendorsForType.indexOf(vendor) == -1)
            {
                vendorsForType.push(vendor);
            }
        }
        return vendorsForType;
    }

    function populateVendorListWith(vendors)
    {
        $('#lst_vendors').empty();
        $.each(vendors, function(key, vendor)
        {
            $('#lst_vendors').append('<option value="' + vendor + '">' + vendor + '</option>');
        });
    }

    function getDeviceSeriesFor(vendor, type)
    {
        var deviceSeriesForVendor = [];
        for (var i = 0; i < devices.length; i++)
        {
            var series = devices[i].series;
            if (devices[i].vendor == vendor &&
                devices[i].type == type &&
                deviceSeriesForVendor.indexOf(series) == -1)
            {
                deviceSeriesForVendor.push(series);
            }
        }
        return deviceSeriesForVendor;
    }

    function populateDeviceSeriesListWith(deviceSeries)
    {
        $('#lst_device_series').empty();
        $.each(deviceSeries, function(key, series)
        {
            $('#lst_device_series').append('<option value="' + series + '">' + series + '</option>');
        });
    }

    function getDevicesFor(vendor, type, series)
    {
        var filteredDevices = [];
        for (var i = 0; i < devices.length; i++)
        {
            if (devices[i].vendor == vendor &&
                devices[i].type == type &&
                devices[i].series == series &&
                filteredDevices.indexOf(devices[i]) == -1)
            {
                filteredDevices.push(devices[i]);
            }
        }
        return filteredDevices;
    }

    function populateDevicesListWith(filteredDevices)
    {
        $('#lst_devices').empty();
        $.each(filteredDevices, function(key, device)
        {
            $('#lst_devices').append('<option value="' + device.id + '">' + device.device + '</option>');
        });
    }

    function loadProtocolsForDevice(deviceID)
    {
        $.ajax(
        {
            dataType: 'json',
            url: urls.serviceProtocols + deviceID,
            success: function(data)
            {
                console.log('Got JSON!');
                console.log(JSON.stringify(data, null, 2));
                var serviceProtocols = getServiceProtocolsListFor(data);
                generateProtocolSelectionMenuFor(serviceProtocols);
            }
        });
    }

    function getServiceProtocolsListFor(data)
    {
        var serviceProtocols = [];
        for (var i = 0; i < data.length; i++)
        {
            var service = data[i].service;
            if (serviceProtocols.hasOwnProperty(service) == false)
            {
                serviceProtocols[service] = [];
            }
            var protocol = {
                'id': data[i].protocol_id,
                'name': data[i].protocol
            };
            serviceProtocols[service].push(protocol);
        }
        console.log(serviceProtocols);
        return serviceProtocols;
    }

    function generateProtocolSelectionMenuFor(serviceProtocols)
    {
        $('#sctn_services').html(''); //clear existing html
        for (var protocolList in serviceProtocols)
        {
            if (serviceProtocols.hasOwnProperty(protocolList))
            {
                var protocolId = protocolList.toLowerCase().replace(/ /g, '-');
                $('#sctn_services').append('<div class="service" id="service-' + protocolId + '"><h3>' + protocolList + '</h3></div>');
                for (var i = 0; i < serviceProtocols[protocolList].length; i++)
                {
                    var protocol = serviceProtocols[protocolList][i];
                    $('#service-' + protocolId).append('<input type="checkbox" id="protocol-' + protocol.id + '" class="protocol" value="' + protocol.id + '">');
                    $('#protocol-' + protocol.id).after('<label for="protocol-' + protocol.id + '">' + protocol.name + '</label>');
                }
            }
        }
    }

    function bindSubmitButtonHandler()
    {
        $('#btn_submit_protocols').click(function()
        {
        	var selectedProtocols = getSelectedProtocols();
            if (selectedProtocols > 0)
            {
            	submitProtocols(selectedProtocols);
            }
            else
            {
            	alert('Please select at least one used protocol.');
            }
        });
    }

    function getSelectedProtocols()
    {
        var usedProtocols = [];
        $('#sctn_services input:checkbox:checked').each(function()
        {
            usedProtocols.push($(this).val());
        });
        return usedProtocols;
    }

    function submitProtocols(protocols)
    {
    	//todo
    }
})();