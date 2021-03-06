(function()
{
    var urls = {
        'devices': '/api/devices/',
        'serviceProtocols': '/api/service-protocols/',
        'warningRecommendations': '/api/warning-recommendations/'
    };
    var devices;
    var currentDevice = {};
    var configuredDevices = [];
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
        bindStartButtonHandler();
        bindSubmitButtonHandler();
        bindAddNewDeviceButtonHandler();
        bindGetSummaryButtonHandler();
        bindPrintSummaryButtonHandler();
        bindRestartButtonHandler();
        bindCancelProtocolSelectionButtonHandler();
        //TODO: put this in CSS
        $('#sctn_summary').hide();
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

    function bindStartButtonHandler()
    {
        $('#btn_start_selection').click(function()
        {
            $('#page_cover').hide();
            $('#page_main').removeClass('hidden');
        });
    }

    function bindListEventHandlers()
    {
        $('#lst_device_types').change(function()
        {
            var vendors = getVendorsFor(this.value); //for device type
            console.log(this);
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
                if (data && data.length > 0)
                {
                    var serviceProtocols = getServiceProtocolsListFor(data);
                    generateProtocolSelectionMenuFor(serviceProtocols);
                    $('#btn_submit_protocols').removeClass('hidden');
                    $('#btn_submit_protocols').show();
                }
                else
                {
                    $('#sctn_services').html('<p>No services found. Please select another device.</p>');
                    $('#btn_submit_protocols').hide();
                }
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
                    $('#service-' + protocolId).append('<input type="checkbox" id="protocol-' + protocol.id + '" class="protocol" value="' + protocol.id + '" name="' + protocol.name + '">');
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
            if (selectedProtocols.length > 0)
            {
                $('#sctn_add_new_device').hide();
                $('#sctn_protocols').hide();
                $('#sctn_continue_buttons').removeClass('hidden');
                $('#sctn_continue_buttons').show();
                submitProtocols(selectedProtocols);
            }
            else
            {
                alert('Please select at least one used protocol.');
            }
        });
    }

    function bindAddNewDeviceButtonHandler()
    {
        $('#btn_add_new_device').click(function()
        {
            $('#sctn_add_new_device').show();
            $('#sctn_services input:checkbox').prop('checked', false);
            $('#sctn_continue_buttons').addClass('hidden');
            $('#sctn_protocols').show();
            $('#sctn_device_overview').removeClass('hidden');
            $('#sctn_device_overview').show();
            if (configuredDevices.length > 0)
            {
                $('#btn_cancel_protocol_selection').removeClass('hidden');
                $('#btn_cancel_protocol_selection').show();
            }
        });
    }

    function bindGetSummaryButtonHandler()
    {
        $('#btn_get_summary').click(function()
        {
            $('#sctn_device_overview').hide();
            $('#sctn_add_new_device').hide();
            $('#sctn_continue_buttons').hide();
            $('#sctn_summary').show();
            $('#sctn_restart_print_buttons').removeClass('hidden');
            $('#sctn_restart_print_buttons').show();
            generateSummary();
        });
    }

    function bindPrintSummaryButtonHandler()
    {
        $('#btn_print_summary').click(function()
        {
            window.print();
        });
    }

    function bindRestartButtonHandler()
    {
        $('#btn_restart').click(function()
        {
            currentDevice = {};
            configuredDevices = [];
            $('#sctn_summary').hide();
            $('#sctn_restart_print_buttons').hide();
            $('#sctn_add_new_device').show();
            $('#sctn_protocols').show();
            $('#sctn_services input:checkbox').prop('checked', false);
            $('#btn_cancel_protocol_selection').hide();
        });
    }

    function bindCancelProtocolSelectionButtonHandler()
    {
        $('#btn_cancel_protocol_selection').click(function()
        {
            $('#sctn_add_new_device').hide();
            $('#sctn_protocols').hide();
            $('#sctn_continue_buttons').removeClass('hidden');
            $('#sctn_continue_buttons').show();
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
        console.log('submitting POST data: ');
        var POSTData = {
            "protocols": protocols
        };
        console.log(POSTData);
        $.ajax(
        {
            type: "POST",
            url: urls.warningRecommendations,
            data: JSON.stringify(POSTData),
            dataType: 'json',
            contentType: 'application/json',
            success: function(data)
            {
                console.log('Got JSON!');
                console.log(data);
                updateDeviceMainAttributes();
                updateDeviceWarningRecommendations(data);
                configuredDevices.push(currentDevice);
                console.log(configuredDevices);
                $('#spn_device_count').html(configuredDevices.length);
                $('#btn_add_new_device').attr('disabled', false);
                $('#btn_get_summary').attr('disabled', false);
            },
            error: function(err)
            {
                console.log('Error submitting POST data:');
                console.log(err);
            }
        });
    }

    function updateDeviceMainAttributes()
    {
        var device = {
            type: $('#lst_device_types option:selected').text(),
            vendor: $('#lst_vendors option:selected').text(),
            series: $('#lst_device_series option:selected').text(),
            name: $('#lst_devices option:selected').text(),
            protocols: []
        };
        $('#sctn_services input:checkbox:checked').each(function()
        {
            var protocol = {
                'id': $(this).val(),
                'name': $(this).attr('name'),
                'warnings': []
            };
            device.protocols.push(protocol);
        });
        currentDevice = device;
    }

    function updateDeviceWarningRecommendations(warningRecommendations)
    {
        for (var i = 0; i < currentDevice.protocols.length; i++)
        {
            currentDevice.protocols[i].warnings = warningRecommendations.filter(function(e)
            {
                return e.protocol == currentDevice.protocols[i].id;
            });
        }
    }

    function generateSummary()
    {
        $('#sctn_summary').html('');
        for (var i = 0; i < configuredDevices.length; i++)
        {
            var device = configuredDevices[i];
            // Device name
            var fullDeviceName = device.vendor + ' ' +
                device.series + ' ' +
                device.name +
                ' <i>(' + device.type + ')</i>';
            $('#sctn_summary').append('<h2>' + fullDeviceName + '</h2>');
            // Protocol warning/rec list
            var protocolsWithWarnings = device.protocols.filter(function(e)
            {
                return e.warnings.length > 0;
            });
            for (var k = 0; k < protocolsWithWarnings.length; k++)
            {
                var protocol = protocolsWithWarnings[k];
                $('#sctn_summary').append('<section class="protocol">');
                $('#sctn_summary section:last-child').append('<h3>' + protocol.name + '</h3>');
                var warningsByName = {};
                for (var w = 0; w < protocol.warnings.length; w++)
                {
                    var warning = protocol.warnings[w];
                    if (!(warning.name in warningsByName)) warningsByName[warning.name] = [];
                    warningsByName[warning.name].push(warning);
                }
                for (var warning in warningsByName)
                {
                    $('#sctn_summary section:last-child').append('<h4>' + warning + '</h4>');
                    $('#sctn_summary section:last-child').append('<p>' + warningsByName[warning][0].description + '</p>');
                    $('#sctn_summary section:last-child').append('<h5>Recommendations:</h5>');
                    $('#sctn_summary section:last-child').append('<ul>');
                    for (var r = 0; r < warningsByName[warning].length; r++)
                    {
                        $('#sctn_summary section:last-child').append('<li>' + warningsByName[warning][r].recommendation + '</li>');
                    }
                    $('#sctn_summary section:last-child').append('</ul>');
                }
                $('#sctn_summary').append('</section>');
            }
        }
    }
})();